// Trigger manual publish via Cloud Function
async function triggerPublish() {
  if (!confirm('This will rebuild the public website. All published directories will go live in 2-3 minutes. Continue?')) return;

  const btn = document.createElement('button');
  btn.textContent = 'Publishing...';
  btn.className = 'btn-primary';
  btn.disabled = true;
  btn.style.position = 'fixed';
  btn.style.top = '10px';
  btn.style.right = '10px';
  btn.style.zIndex = '9999';
  document.body.appendChild(btn);

  try {
    const triggerFn = functions.httpsCallable('triggerPublish');
    const result = await triggerFn();
    alert('Build triggered successfully! Published directories will be live in 2-3 minutes.');
    btn.remove();
  } catch (error) {
    console.error('Publish failed:', error);
    alert('Failed to trigger build. Try again or check the manual publish button in the dashboard.');
    btn.remove();
  }
}

// Load build status from GitHub Actions
async function loadBuildStatus() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Build Status</h2>
    <div style="margin-bottom:1rem;">
      <button class="btn-primary" onclick="triggerPublish()" style="width:auto;">🚀 Publish All Changes</button>
    </div>
    <div id="buildStatusContent" class="card">
      <p>Loading build status...</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.github.com/repos/stevemacharia356-1gtm/directory-engine/actions/runs?per_page=1');
    const data = await response.json();
    
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0];
      const statusColors = { completed: run.conclusion === 'success' ? '#28a745' : '#dc3545', in_progress: '#ffc107', queued: '#6c757d' };
      const statusColor = statusColors[run.status] || '#6c757d';
      const statusText = run.status === 'completed' ? run.conclusion : run.status;
      const timestamp = new Date(run.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

      document.getElementById('buildStatusContent').innerHTML = `
        <div style="display:flex; align-items:center; gap:1rem;">
          <div style="width:20px; height:20px; border-radius:50%; background:${statusColor};"></div>
          <div>
            <strong>Status:</strong> ${statusText}<br>
            <strong>Last build:</strong> ${timestamp}<br>
            <a href="${run.html_url}" target="_blank">View logs on GitHub →</a>
          </div>
        </div>
      `;

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