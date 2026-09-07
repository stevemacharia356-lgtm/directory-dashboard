// Trigger manual publish via Cloud Function
async function triggerPublish(btnElement) {
  const btn = btnElement || document.querySelector('.btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Publishing...'; }

  try {
    const triggerFn = functions.httpsCallable('triggerPublish');
    const result = await triggerFn();
    btn.textContent = '✓ Build Triggered';
    setTimeout(() => { btn.textContent = '🚀 Publish All Changes'; btn.disabled = false; }, 3000);
  } catch (error) {
    console.error('Publish failed:', error);
    btn.textContent = '✗ Failed. Try Again';
    setTimeout(() => { btn.textContent = '🚀 Publish All Changes'; btn.disabled = false; }, 3000);
  }
}

// Load build status from GitHub Actions
async function loadBuildStatus() {
  const content = document.getElementById('content');
  content.innerHTML = '<h2>Build Status</h2><div style="margin-bottom:1rem;"><button class="btn-primary" id="btnPublishAll" onclick="triggerPublish(this)" style="width:auto;">🚀 Publish All Changes</button></div><div id="buildStatusContent" class="card"><p>Loading build status...</p></div>';

  try {
    const response = await fetch('https://api.github.com/repos/stevemacharia356-lgtm/directory-engine/actions/runs?per_page=1');
    const data = await response.json();
    
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0];
      const statusColor = run.status === 'completed' ? (run.conclusion === 'success' ? '#28a745' : '#dc3545') : '#ffc107';
      const statusText = run.status === 'completed' ? run.conclusion : run.status;
      const timestamp = new Date(run.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

      document.getElementById('buildStatusContent').innerHTML = '<div style="display:flex; align-items:center; gap:1rem;"><div style="width:20px; height:20px; border-radius:50%; background:' + statusColor + ';"></div><div><strong>Status:</strong> ' + statusText + '<br><strong>Last build:</strong> ' + timestamp + '<br><a href="' + run.html_url + '" target="_blank">View logs on GitHub →</a></div></div>';

      if (run.status === 'in_progress') {
        setTimeout(loadBuildStatus, 30000);
      }
    } else {
      document.getElementById('buildStatusContent').innerHTML = '<p>No build runs found yet.</p>';
    }
  } catch (error) {
    document.getElementById('buildStatusContent').innerHTML = '<p>Could not load build status. Check your internet connection.</p>';
  }
}