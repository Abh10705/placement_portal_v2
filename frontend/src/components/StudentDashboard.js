const StudentDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Student Dashboard</h2>

      <!-- Available Drives -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-dark text-white">Active Placement Drives</div>
        <div class="card-body">
          <div class="row">
            <div v-for="drive in drives" :key="drive.id" class="col-md-6 mb-3">
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">{{ drive.job_title }}</h5>
                  <h6 class="card-subtitle mb-2 text-muted">{{ drive.company_name }}</h6>
                  <p class="card-text"><strong>Eligibility:</strong> {{ drive.eligibility || 'N/A' }}</p>
                  <p class="card-text"><small class="text-muted">Deadline: {{ drive.application_deadline }}</small></p>
                  <button @click="apply(drive.id)" class="btn btn-sm btn-success">Apply Now</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      drives: []
    };
  },
  mounted() {
    this.fetchDrives();
  },
  methods: {
    async fetchDrives() {
      const res = await fetch('http://localhost:5000/api/student/drives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.drives = await res.json();
    },
    async apply(driveId) {
      const res = await fetch(`http://localhost:5000/api/student/drives/${driveId}/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      alert(data.message || data.error);
    }
  }
};
