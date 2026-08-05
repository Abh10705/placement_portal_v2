const CompanyDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Company Dashboard</h2>
      
      <!-- Create Drive Form -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-dark text-white">Post New Placement Drive</div>
        <div class="card-body">
          <form @submit.prevent="createDrive">
            <div class="row">
              <div class="col-md-6 mb-3">
                <input v-model="form.job_title" class="form-control" placeholder="Job Title" required />
              </div>
              <div class="col-md-6 mb-3">
                <input v-model="form.application_deadline" type="date" class="form-control" required />
              </div>
            </div>
            <div class="mb-3">
              <textarea v-model="form.eligibility" class="form-control" placeholder="Eligibility Criteria (Branch, CGPA, etc.)"></textarea>
            </div>
            <div class="mb-3">
              <textarea v-model="form.job_description" class="form-control" placeholder="Job Description"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Submit Drive for Admin Approval</button>
          </form>
        </div>
      </div>

      <!-- Active Drives -->
      <div class="card shadow-sm">
        <div class="card-header bg-secondary text-white">Your Placement Drives</div>
        <div class="card-body">
          <ul class="list-group">
            <li v-for="drive in drives" :key="drive.id" class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <h5 class="mb-1">{{ drive.job_title }}</h5>
                <small class="text-muted">Deadline: {{ drive.application_deadline }} | Status: <strong class="text-capitalize">{{ drive.status }}</strong></small>
              </div>
              <span class="badge bg-primary rounded-pill">{{ drive.applicant_count }} Applicants</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: [],
      form: { job_title: '', application_deadline: '', eligibility: '', job_description: '' }
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
      const res = await fetch('http://localhost:5000/api/company/drives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(this.form)
      });
      if (res.ok) {
        this.form = { job_title: '', application_deadline: '', eligibility: '', job_description: '' };
        this.fetchDrives();
      }
    }
  }
};
