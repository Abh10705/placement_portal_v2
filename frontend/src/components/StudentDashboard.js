const StudentDashboard = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2>Student Dashboard</h2>
        <button @click="triggerCsvExport" class="btn btn-outline-success" :disabled="exporting">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          Export Applications (CSV)
        </button>
      </div>

      <div v-if="exportMessage" class="alert alert-info alert-dismissible fade show" role="alert">
        {{ exportMessage }}
        <button type="button" class="btn-close" @click="exportMessage = ''"></button>
      </div>

      <!-- Approved Placement Drives with Search & Filter -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <span class="fw-bold">Available Placement Drives</span>
          <div class="d-flex gap-2">
            <input type="text" v-model="searchQuery" class="form-control form-control-sm" placeholder="Search title or company...">
            <input type="text" v-model="eligibilityFilter" class="form-control form-control-sm" placeholder="Filter eligibility...">
          </div>
        </div>
        <div class="card-body">
          <div class="row" v-if="filteredDrives.length">
            <div class="col-md-6 mb-3" v-for="drive in filteredDrives" :key="drive.id">
              <div class="card h-100 border-light shadow-sm">
                <div class="card-body">
                  <h5 class="card-title text-primary">{{ drive.job_title }}</h5>
                  <h6 class="card-subtitle mb-2 text-muted">{{ drive.company_name }}</h6>
                  <p class="card-text mb-1"><strong>Eligibility:</strong> {{ drive.eligibility }}</p>
                  <p class="card-text mb-2"><strong>Deadline:</strong> {{ drive.application_deadline }}</p>
                  <button @click="applyForDrive(drive.id)" class="btn btn-sm btn-primary" :disabled="hasApplied(drive.id)">
                    {{ hasApplied(drive.id) ? 'Applied' : 'Apply Now' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-muted m-0">No matching placement drives found.</p>
        </div>
      </div>

      <!-- Application History -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white fw-bold">My Application History</div>
        <div class="card-body">
          <table class="table table-hover" v-if="applications.length">
            <thead>
              <tr>
                <th>Drive Title</th>
                <th>Company</th>
                <th>Applied At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in applications" :key="app.id">
                <td>{{ app.job_title }}</td>
                <td>{{ app.company_name }}</td>
                <td>{{ app.applied_at }}</td>
                <td>
                  <span class="badge" :class="statusBadgeClass(app.status)">{{ app.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-muted m-0">You have not applied to any drives yet.</p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: [],
      applications: [],
      searchQuery: '',
      eligibilityFilter: '',
      exporting: false,
      exportMessage: ''
    };
  },
  computed: {
    filteredDrives() {
      return this.drives.filter(d => {
        const matchesSearch = !this.searchQuery || 
          d.job_title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
          d.company_name.toLowerCase().includes(this.searchQuery.toLowerCase());
        const matchesEligibility = !this.eligibilityFilter || 
          d.eligibility.toLowerCase().includes(this.eligibilityFilter.toLowerCase());
        return matchesSearch && matchesEligibility;
      });
    }
  },
  mounted() {
    this.fetchDrives();
    this.fetchApplications();
  },
  methods: {
    async fetchDrives() {
      const res = await fetch('http://localhost:5000/api/student/drives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.drives = await res.json();
    },
    async fetchApplications() {
      const res = await fetch('http://localhost:5000/api/student/applications', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.applications = await res.json();
    },
    hasApplied(driveId) {
      return this.applications.some(a => a.drive_id === driveId);
    },
    async applyForDrive(driveId) {
      const res = await fetch(`http://localhost:5000/api/student/drives/${driveId}/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        this.fetchApplications();
      }
    },
    async triggerCsvExport() {
      this.exporting = true;
      this.exportMessage = '';
      try {
        const res = await fetch('http://localhost:5000/api/student/export-csv', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (res.ok) {
          this.exportMessage = `Export job started! Task ID: ${data.task_id}`;
        } else {
          this.exportMessage = 'Failed to start export task.';
        }
      } catch (err) {
        this.exportMessage = 'Error triggering export.';
      } finally {
        this.exporting = false;
      }
    },
    statusBadgeClass(status) {
      switch (status ? status.toLowerCase() : '') {
        case 'selected': return 'bg-success';
        case 'shortlisted': return 'bg-info text-dark';
        case 'rejected': return 'bg-danger';
        default: return 'bg-warning text-dark';
      }
    }
  }
};
