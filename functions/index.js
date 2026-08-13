const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();

exports.processImage = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  if (!contentType || !contentType.startsWith('image/')) return;
  if (!filePath.includes('-raw.')) return;

  const bucket = admin.storage().bucket(object.bucket);
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  const outputFileName = fileName.replace('-raw.', '.');
  const outputPath = path.join(dirName, outputFileName);

  const tempInputPath = path.join(os.tmpdir(), fileName);
  const tempOutputPath = path.join(os.tmpdir(), outputFileName);

  try {
    const dirSlug = filePath.split('/')[1];
    const listingSlug = filePath.split('/')[2];
    const docRef = admin.firestore().collection('directories').doc(dirSlug);
    const doc = await docRef.get();
    
    if (!doc.exists) return;

    const statusField = filePath.includes('/hero-') ? 'heroImageStatus' : 'thumbnailStatus';
    
    if (listingSlug && statusField === 'thumbnailStatus') {
      const data = doc.data();
      const listings = data.listings || [];
      const listingIndex = listings.findIndex(l => l.slug === listingSlug);
      if (listingIndex !== -1) {
        listings[listingIndex].thumbnailStatus = 'processing';
        await docRef.update({ listings: listings });
      }
    } else {
      await docRef.update({ [statusField]: 'processing' });
    }

    await bucket.file(filePath).download({ destination: tempInputPath });
    await sharp(tempInputPath)
      .resize(800)
      .webp({ quality: 80 })
      .toFile(tempOutputPath);

    await bucket.upload(tempOutputPath, {
      destination: outputPath,
      metadata: { contentType: 'image/webp' }
    });

    await bucket.file(filePath).delete();

    const encodedPath = encodeURIComponent(outputPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

    if (listingSlug && statusField === 'thumbnailStatus') {
      const doc2 = await docRef.get();
      const data2 = doc2.data();
      const listings2 = data2.listings || [];
      const idx = listings2.findIndex(l => l.slug === listingSlug);
      if (idx !== -1) {
        listings2[idx].thumbnailStatus = 'ready';
        listings2[idx].thumbnail = url;
        await docRef.update({ listings: listings2 });
      }
    } else {
      await docRef.update({ 
        [statusField]: 'ready',
        heroImage: url
      });
    }

    fs.unlinkSync(tempInputPath);
    fs.unlinkSync(tempOutputPath);

  } catch (error) {
    console.error('Image processing failed:', error);
    
    const dirSlug = filePath.split('/')[1];
    const listingSlug = filePath.split('/')[2];
    const docRef = admin.firestore().collection('directories').doc(dirSlug);
    const statusField = filePath.includes('/hero-') ? 'heroImageStatus' : 'thumbnailStatus';

    if (listingSlug && statusField === 'thumbnailStatus') {
      const doc = await docRef.get();
      const data = doc.data();
      const listings = data.listings || [];
      const idx = listings.findIndex(l => l.slug === listingSlug);
      if (idx !== -1) {
        listings[idx].thumbnailStatus = 'error';
        await docRef.update({ listings: listings });
      }
    } else {
      await docRef.update({ [statusField]: 'error' });
    }
  }
});

exports.triggerPublish = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const githubToken = functions.config().github.token;
  if (!githubToken) {
    throw new functions.https.HttpsError('internal', 'GitHub token not configured.');
  }

  try {
    const response = await fetch('https://api.github.com/repos/stevemacharia356-lgtm/directory-engine/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event_type: 'manual-deploy' })
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Publish trigger failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});