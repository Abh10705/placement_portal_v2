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

      <!-- Student Profile & Resume Section -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-dark text-white fw-bold">My Profile & Resume</div>
        <div class="card-body">
          <div v-if="profileMessage" class="alert alert-success alert-dismissible fade show" role="alert">
            {{ profileMessage }}
            <button type="button" class="btn-close" @click="profileMessage = ''"></button>
          </div>
          <form @submit.prevent="updateProfile">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label fw-bold">Roll Number</label>
                <input type="text" v-model="profile.roll_no" class="form-control" required placeholder="e.g. 24F2005305">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">Branch</label>
                <input type="text" v-model="profile.branch" class="form-control" required placeholder="e.g. Computer Science">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">CGPA</label>
                <input type="number" step="0.01" v-model="profile.cgpa" class="form-control" required placeholder="e.g. 8.5">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">Phone</label>
                <input type="text" v-model="profile.phone" class="form-control" required placeholder="e.g. 9876543210">
              </div>
            </div>

            <div class="mt-3">
              <label class="form-label fw-bold">Upload Resume (PDF only)</label>
              <input type="file" ref="resumeInput" @change="handleFileUpload" accept="application/pdf" class="form-control">
              <div v-if="profile.resume_path" class="form-text text-success">
                Current Resume: 
                <a :href="'http://localhost:5000/api/student/resume/' + profile.resume_path" target="_blank" class="fw-bold">
                  View PDF
                </a>
              </div>
            </div>

            <div class="mt-3">
              <button type="submit" class="btn btn-primary" :disabled="savingProfile">
                <span v-if="savingProfile" class="spinner-border spinner-border-sm me-1"></span>
                Save Profile
              </button>
            </div>
          </form>
        </div>
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
      exportMessage: '',
      profile: {
        roll_no: '',
        branch: '',
        cgpa: '',
        phone: '',
        resume_path: ''
      },
      selectedFile: null,
      savingProfile: false,
      profileMessage: ''
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
    this.fetchProfile();
    this.fetchDrives();
    this.fetchApplications();
  },
  methods: {
    async fetchProfile() {
      const res = await fetch('http://localhost:5000/api/student/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.profile = {
          roll_no: data.roll_no || '',
          branch: data.branch || '',
          cgpa: data.cgpa || '',
          phone: data.phone || '',
          resume_path: data.resume_path || ''
        };
      }
    },
    handleFileUpload(event) {
      this.selectedFile = event.target.files[0];
    },
    async updateProfile() {
      this.savingProfile = true;
      this.profileMessage = '';

      const formData = new FormData();
      formData.append('roll_no', this.profile.roll_no);
      formData.append('branch', this.profile.branch);
      formData.append('cgpa', this.profile.cgpa);
      formData.append('phone', this.profile.phone);

      if (this.selectedFile) {
        formData.append('resume', this.selectedFile);
      }

      try {
        const res = await fetch('http://localhost:5000/api/student/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (res.ok) {
          this.profileMessage = 'Profile updated successfully!';
          this.fetchProfile();
        } else {
          this.profileMessage = 'Failed to update profile.';
        }
      } catch (err) {
        this.profileMessage = 'Error updating profile.';
      } finally {
        this.savingProfile = false;
      }
    },
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
