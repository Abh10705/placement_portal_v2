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
          <div v-if="profileMessage" :class="['alert', profileError ? 'alert-danger' : 'alert-success', 'alert-dismissible', 'fade', 'show']" role="alert">
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
                <button type="button" @click="viewPdf" class="btn btn-link p-0 fw-bold align-baseline">View PDF</button>
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

      <!-- Available Placement Drives -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
          <span>Available Placement Drives</span>
          <div class="d-flex gap-2">
            <input type="text" v-model="searchQuery" class="form-control form-control-sm" placeholder="Search title or company...">
            <input type="text" v-model="eligibilityFilter" class="form-control form-control-sm" placeholder="Filter vacancy...">
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="filteredDrives.length === 0" class="p-3 text-muted">
            No matching placement drives found.
          </div>
          <table v-else class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Company</th>
                <th>Role Title</th>
                <th>Vacancy</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="drive in filteredDrives" :key="drive.id">
                <td>{{ drive.company_name }}</td>
                <td>{{ drive.job_title }}</td>
                <td>{{ drive.eligibility }}</td>
                <td>{{ drive.application_deadline }}</td>
                <td>
                  <button @click="selectedDrive = drive" class="btn btn-sm btn-info me-1">View Details</button>
                  <button @click="applyToDrive(drive.id)" class="btn btn-sm btn-outline-primary" :disabled="hasApplied(drive.id)">
                    {{ hasApplied(drive.id) ? 'Applied' : 'Apply Now' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Application History -->
      <div class="card shadow-sm">
        <div class="card-header bg-secondary text-white fw-bold">My Application History</div>
        <div class="card-body p-0">
          <div v-if="applications.length === 0" class="p-3 text-muted">
            You have not applied to any drives yet.
          </div>
          <table v-else class="table table-striped mb-0">
            <thead class="table-light">
              <tr>
                <th>Company</th>
                <th>Role Title</th>
                <th>Applied On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in applications" :key="app.application_id">
                <td>{{ app.company_name }}</td>
                <td>{{ app.job_title }}</td>
                <td>{{ app.applied_at }}</td>
                <td>
                  <span :class="['badge', app.status === 'applied' ? 'bg-info' : app.status === 'shortlisted' ? 'bg-success' : 'bg-secondary']">
                    {{ app.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    
      <!-- View Drive Details Modal -->
      <div v-if="selectedDrive" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ selectedDrive.company_name || 'Placement Drive Details' }}</h5>
              <button type="button" class="btn-close" @click="selectedDrive = null"></button>
            </div>
            <div class="modal-body">
              <h6 class="text-primary fw-bold">{{ selectedDrive.job_title }}</h6>
              <hr>
              <p><strong>Vacancy:</strong> {{ selectedDrive.eligibility || 'N/A' }}</p>
              <p><strong>Deadline:</strong> {{ selectedDrive.application_deadline }}</p>
              <p><strong>Job Description:</strong></p>
              <div class="p-2 bg-light border rounded mb-3" style="white-space: pre-line; max-height: 200px; overflow-y: auto;">
                {{ selectedDrive.job_description || 'No description provided.' }}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="selectedDrive = null">Close</button>
              <button type="button" class="btn btn-primary" @click="applyForDrive(selectedDrive.id); selectedDrive = null;" :disabled="hasApplied(selectedDrive.id)">
                {{ hasApplied(selectedDrive.id) ? 'Applied' : 'Apply Now' }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      selectedDrive: null,
      profile: {
        roll_no: '',
        branch: '',
        cgpa: '',
        phone: '',
        resume_path: ''
      },
      resumeFile: null,
      drives: [],
      applications: [],
      searchQuery: '',
      eligibilityFilter: '',
      profileMessage: '',
      profileError: false,
      savingProfile: false,
      exporting: false,
      exportMessage: ''
    };
  },
  computed: {
    filteredDrives() {
      return this.drives.filter(drive => {
        const titleMatch = drive.job_title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           drive.company_name.toLowerCase().includes(this.searchQuery.toLowerCase());
        const eligibilityMatch = !this.eligibilityFilter || 
                                 drive.eligibility.toLowerCase().includes(this.eligibilityFilter.toLowerCase());
        return titleMatch && eligibilityMatch;
      });
    }
  },
  mounted() {
    this.fetchProfile();
    this.fetchDrives();
    this.fetchApplications();
  },
  methods: {
    getAuthHeaders() {
      const token = localStorage.getItem('token');
      return {
      selectedDrive: null, 'Authorization': `Bearer ${token}` };
    },
    async fetchProfile() {
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/profile`, {
          headers: this.getAuthHeaders()
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
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    },
    async fetchDrives() {
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/drives`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          this.drives = await res.json();
        }
      } catch (err) {
        console.error('Failed to fetch drives', err);
      }
    },
    async fetchApplications() {
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/applications`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          this.applications = await res.json();
        }
      } catch (err) {
        console.error('Failed to fetch applications', err);
      }
    },
    handleFileUpload(event) {
      this.resumeFile = event.target.files[0];
    },
    async updateProfile() {
      this.savingProfile = true;
      this.profileMessage = '';
      this.profileError = false;

      const formData = new FormData();
      formData.append('roll_no', this.profile.roll_no);
      formData.append('branch', this.profile.branch);
      formData.append('cgpa', this.profile.cgpa);
      formData.append('phone', this.profile.phone);
      if (this.resumeFile) {
        formData.append('resume', this.resumeFile);
      }

      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/profile`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: formData
        });

        const data = await res.json();
        if (res.ok) {
          this.profileMessage = 'Profile updated successfully!';
          this.fetchProfile();
        } else {
          this.profileError = true;
          this.profileMessage = data.error || 'Failed to update profile.';
        }
      } catch (err) {
        this.profileError = true;
        this.profileMessage = 'Network error while updating profile.';
      } finally {
        this.savingProfile = false;
      }
    },
    async viewPdf() {
      if (!this.profile.resume_path) return;
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/resume/${this.profile.resume_path}`, {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const blob = await res.blob();
          const fileUrl = URL.createObjectURL(blob);
          window.open(fileUrl, '_blank');
        } else {
          alert('Could not open PDF file.');
        }
      } catch (err) {
        console.error('Error opening PDF:', err);
      }
    },
    hasApplied(driveId) {
      return this.applications.some(app => app.drive_id === driveId);
    },
    async applyToDrive(driveId) {
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/drives/${driveId}/apply`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          this.fetchApplications();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to apply');
        }
      } catch (err) {
        console.error('Error applying to drive:', err);
      }
    },
    async triggerCsvExport() {
      this.exporting = true;
      this.exportMessage = '';
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/student/export-csv`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
        const data = await res.json();
        if (res.ok) {
          this.exportMessage = `${data.message} (Task ID: ${data.task_id})`;
        } else {
          this.exportMessage = data.error || 'Failed to trigger export.';
        }
      } catch (err) {
        this.exportMessage = 'Error connecting to server for CSV export.';
      } finally {
        this.exporting = false;
      }
    }
  }
};
