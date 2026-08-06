const CompanyDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Company Dashboard</h2>

      <!-- Create Placement Drive Form -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-primary text-white font-weight-bold">Create New Placement Drive</div>
        <div class="card-body">
          <form @submit.prevent="createDrive">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Job Title</label>
                <input type="text" v-model="newDrive.job_title" class="form-control" required placeholder="e.g. Software Engineer">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Eligibility Criteria</label>
                <input type="text" v-model="newDrive.eligibility" class="form-control" required placeholder="e.g. CGPA > 8.0, CS/IT">
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Job Description</label>
              <textarea v-model="newDrive.job_description" class="form-control" rows="2" required></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">Application Deadline</label>
              <input type="date" v-model="newDrive.application_deadline" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="submitting">Create Drive</button>
          </form>
        </div>
      </div>

      <!-- Created Placement Drives & Applicants -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-dark text-white fw-bold">My Placement Drives & Applicants</div>
        <div class="card-body">
          <div v-if="drives.length">
            <div v-for="drive in drives" :key="drive.id" class="card mb-3 border-light shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h5 class="card-title text-primary m-0">{{ drive.job_title }}</h5>
                  <span class="badge" :class="drive.status === 'Approved' ? 'bg-success' : 'bg-warning text-dark'">
                    {{ drive.status }}
                  </span>
                </div>
                <p class="card-text mb-1"><strong>Eligibility:</strong> {{ drive.eligibility }}</p>
                <p class="card-text mb-3"><strong>Deadline:</strong> {{ drive.application_deadline }}</p>

                <h6>Applicants ({{ drive.applicants ? drive.applicants.length : 0 }})</h6>
                <table class="table table-sm table-hover" v-if="drive.applicants && drive.applicants.length">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Applied At</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="app in drive.applicants" :key="app.id">
                      <td>{{ app.student_id }}</td>
                      <td>{{ app.applied_at }}</td>
                      <td>
                        <span class="badge" :class="statusBadgeClass(app.status)">{{ app.status }}</span>
                      </td>
                      <td>
                        <button @click="updateStatus(app.id, 'Shortlisted')" class="btn btn-xs btn-outline-info me-1">Shortlist</button>
                        <button @click="updateStatus(app.id, 'Selected')" class="btn btn-xs btn-outline-success me-1">Select</button>
                        <button @click="updateStatus(app.id, 'Rejected')" class="btn btn-xs btn-outline-danger">Reject</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="text-muted small m-0">No applicants yet.</p>
              </div>
            </div>
          </div>
          <p v-else class="text-muted m-0">No placement drives created yet.</p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: [],
      newDrive: {
        job_title: '',
        eligibility: '',
        job_description: '',
        application_deadline: ''
      },
      submitting: false
    };
  },
  mounted() {
    this.fetchDrives();
  },
  methods: {
    async fetchDrives() {
      const res = await fetch('http://localhost:5000/api/company/drives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.drives = await res.json();
    },
    async createDrive() {
      this.submitting = true;
      const res = await fetch('http://localhost:5000/api/company/drives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(this.newDrive)
      });
      if (res.ok) {
        this.newDrive = { job_title: '', eligibility: '', job_description: '', application_deadline: '' };
        this.fetchDrives();
      }
      this.submitting = false;
    },
    async updateStatus(applicationId, newStatus) {
      await fetch(`http://localhost:5000/api/company/applications/${applicationId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      this.fetchDrives();
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
