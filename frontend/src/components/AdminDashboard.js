const AdminDashboard = {
  template: `
    <div>
      <h2 class="mb-4">Admin Dashboard</h2>
      
      <!-- Stats Cards -->
      <div class="row mb-4">
        <div class="col-md-4">
          <div class="card bg-primary text-white p-3">
            <h5>Total Students</h5>
            <h3>{{ stats.total_students || 0 }}</h3>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-success text-white p-3">
            <h5>Approved Companies</h5>
            <h3>{{ stats.total_companies || 0 }}</h3>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-info text-white p-3">
            <h5>Active Placement Drives</h5>
            <h3>{{ stats.total_drives || 0 }}</h3>
          </div>
        </div>
      </div>

      <!-- System Actions & Reports -->
      <div class="card mb-4 shadow-sm border-primary">
        <div class="card-header bg-primary text-white">System Actions & Reports</div>
        <div class="card-body d-flex gap-3 align-items-center">
          <button @click="triggerMonthlyReport" class="btn btn-outline-primary" :disabled="loadingReport">
            <span v-if="loadingReport" class="spinner-border spinner-border-sm me-1"></span>
            Trigger Monthly Report Task
          </button>
          <span v-if="reportStatus" class="text-success small fw-bold">{{ reportStatus }}</span>
        </div>
      </div>

      <!-- Pending Student Approvals -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-info text-dark">Pending Student Registrations</div>
        <div class="card-body">
          <table class="table table-hover" v-if="pendingStudents.length">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Roll No</th>
                <th>Branch</th>
                <th>CGPA</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stu in pendingStudents" :key="stu.id">
                <td>{{ stu.full_name }}</td>
                <td>{{ stu.email }}</td>
                <td>{{ stu.roll_no }}</td>
                <td>{{ stu.branch }}</td>
                <td>{{ stu.cgpa }}</td>
                <td>
                  <button @click="approveStudent(stu.id, 'approve')" class="btn btn-sm btn-success me-2">Approve</button>
                  <button @click="approveStudent(stu.id, 'reject')" class="btn btn-sm btn-danger">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-muted m-0">No pending student registrations.</p>
        </div>
      </div>

      < Pending Company Approvals -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-dark text-white">Pending Company Registrations</div>
        <div class="card-body">
          <table class="table table-hover" v-if="pendingCompanies.length">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>HR Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="comp in pendingCompanies" :key="comp.id">
                <td>{{ comp.company_name }}</td>
                <td>{{ comp.email }}</td>
                <td>{{ comp.hr_contact }}</td>
                <td>
                  <button @click="approveCompany(comp.id, 'approve')" class="btn btn-sm btn-success me-2">Approve</button>
                  <button @click="approveCompany(comp.id, 'reject')" class="btn btn-sm btn-danger">Reject</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-muted m-0">No pending company registrations.</p>
        </div>
      </div>

      <!-- Pending Placement Drives -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-secondary text-white">Pending Placement Drives</div>
        <div class="card-body">
          <table class="table table-hover" v-if="pendingDrives.length">
            <thead>
              <tr>
                <th>Company</th>
                <th>Job Title</th>
                <th>Vacancy</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="drive in pendingDrives" :key="drive.id">
                <tr>
                  <td>{{ drive.company_name }}</td>
                  <td>{{ drive.job_title }}</td>
                  <td>{{ drive.vacancy || drive.eligibility }}</td>
                  <td>{{ drive.application_deadline }}</td>
                  <td>
                    <button @click="toggleDriveDetails(drive)" class="btn btn-sm btn-info text-white me-2">
                      {{ drive.showDetails ? "Hide" : "View" }}
                    </button>
                    <button @click="approveDrive(drive.id, 'approve')" class="btn btn-sm btn-success me-2">Approve</button>
                    <button @click="approveDrive(drive.id, 'reject')" class="btn btn-sm btn-danger">Reject</button>
                  </td>
                </tr>
                <tr v-if="drive.showDetails" class="bg-light">
                  <td colspan="5" class="p-3">
                    <strong>Job Description:</strong>
                    <p class="mb-1">{{ drive.job_description || 'No description provided.' }}</p>
                    <strong>Eligibility Criteria:</strong>
                    <p class="mb-0">{{ drive.eligibility }}</p>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <p v-else class="text-muted m-0">No pending placement drives.</p>
        </div>
      </div>

      <!-- User Management / Blacklist with Search -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <span>User Management</span>
          <input type="text" v-model="userSearchQuery" class="form-control form-control-sm w-25" placeholder="Search users by email...">
        </div>
        <div class="card-body">
          <table class="table table-hover" v-if="filteredUsers.length">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filteredUsers" :key="u.id">
                <td>{{ u.id }}</td>
                <td>{{ u.email }}</td>
                <td><span class="badge bg-info text-dark">{{ u.role }}</span></td>
                <td>
                  <span v-if="u.is_blacklisted" class="badge bg-danger">Blacklisted</span>
                  <span v-else class="badge bg-success">Active</span>
                </td>
                <td>
                  <button @click="toggleBlacklist(u.id)" class="btn btn-sm" :class="u.is_blacklisted ? 'btn-outline-success' : 'btn-outline-danger'">
                    {{ u.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-muted m-0">No matching users found.</p>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      stats: {},
      pendingStudents: [],
      pendingCompanies: [],
      pendingDrives: [],
      allUsers: [],
      userSearchQuery: '',
      loadingReport: false,
      reportStatus: ''
    };
  },
  computed: {
    filteredUsers() {
      if (!this.userSearchQuery) return this.allUsers;
      const q = this.userSearchQuery.toLowerCase();
      return this.allUsers.filter(u => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
    }
  },
  mounted() {
    this.fetchStats();
    this.fetchPendingStudents();
    this.fetchPendingCompanies();
    this.fetchPendingDrives();
    this.fetchAllUsers();
  },
  methods: {
    toggleDriveDetails(drive) {
      drive.showDetails = !drive.showDetails; this.$forceUpdate();
    },
    async fetchStats() {
      const res = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.stats = await res.json();
    },
    async fetchPendingStudents() {
      const res = await fetch('http://localhost:5000/api/admin/students/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.pendingStudents = await res.json();
    },
    async approveStudent(id, action) {
      await fetch(`http://localhost:5000/api/admin/students/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      this.fetchPendingStudents();
      this.fetchStats();
    },
    async fetchPendingCompanies() {
      const res = await fetch('http://localhost:5000/api/admin/companies/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.pendingCompanies = await res.json();
    },
    async approveCompany(id, action) {
      await fetch(`http://localhost:5000/api/admin/companies/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      this.fetchPendingCompanies();
      this.fetchStats();
    },
    async fetchPendingDrives() {
      const res = await fetch('http://localhost:5000/api/admin/drives/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.pendingDrives = data.map(d => ({ ...d, showDetails: false }));
      }
    },
    async approveDrive(id, action) {
      await fetch(`http://localhost:5000/api/admin/drives/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      this.fetchPendingDrives();
      this.fetchStats();
    },
    async fetchAllUsers() {
      const res = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) this.allUsers = await res.json();
    },
    async toggleBlacklist(userId) {
      await fetch(`http://localhost:5000/api/admin/users/${userId}/toggle-blacklist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      this.fetchAllUsers();
    },
    async triggerMonthlyReport() {
      this.loadingReport = true;
      this.reportStatus = '';
      try {
        const res = await fetch('http://localhost:5000/api/admin/trigger-report', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (res.ok) {
          this.reportStatus = `Task triggered! (ID: ${data.task_id})`;
        } else {
          this.reportStatus = 'Failed to trigger task.';
        }
      } catch (err) {
        this.reportStatus = 'Error triggering report.';
      } finally {
        this.loadingReport = false;
      }
    }
  }
};
