const Login = {
  template: `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <!-- Navigation Tabs -->
            <ul class="nav nav-pills nav-justified mb-4">
              <li class="nav-item">
                <button class="nav-link" :class="{ active: view === 'login' }" @click="switchView('login')">Login</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: view === 'register_student' }" @click="switchView('register_student')">Register Student</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: view === 'register_company' }" @click="switchView('register_company')">Register Company</button>
              </li>
            </ul>

            <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
            <div v-if="successMsg" class="alert alert-success py-2">{{ successMsg }}</div>

            <!-- LOGIN FORM -->
            <form v-if="view === 'login'" @submit.prevent="handleLogin">
              <h4 class="text-center mb-3">Login to Placement Portal</h4>
              <div class="mb-3 text-start">
                <label class="form-label font-weight-bold">Email Address</label>
                <input type="email" v-model="loginData.email" class="form-control" placeholder="user@domain.com" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label font-weight-bold">Password</label>
                <input type="password" v-model="loginData.password" class="form-control" placeholder="••••••••" required>
              </div>
              <button type="submit" class="btn btn-primary w-100 py-2 mt-2" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Login
              </button>
            </form>

            <!-- STUDENT REGISTRATION FORM -->
            <form v-if="view === 'register_student'" @submit.prevent="handleRegisterStudent">
              <h4 class="text-center mb-3">Student Registration</h4>
              <div class="mb-3 text-start">
                <label class="form-label">Full Name</label>
                <input type="text" v-model="studentData.full_name" class="form-control" placeholder="John Doe" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">Email Address</label>
                <input type="email" v-model="studentData.email" class="form-control" placeholder="student@domain.com" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">Password</label>
                <input type="password" v-model="studentData.password" class="form-control" placeholder="••••••••" required>
              </div>
              <div class="row">
                <div class="col-md-6 mb-3 text-start">
                  <label class="form-label">Roll Number</label>
                  <input type="text" v-model="studentData.roll_number" class="form-control" placeholder="24F1000000" required>
                </div>
                <div class="col-md-6 mb-3 text-start">
                  <label class="form-label">CGPA / Percentage</label>
                  <input type="number" step="0.01" v-model="studentData.cgpa" class="form-control" placeholder="8.5" required>
                </div>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">Branch / Department</label>
                <input type="text" v-model="studentData.branch" class="form-control" placeholder="Computer Science" required>
              </div>
              <button type="submit" class="btn btn-success w-100 py-2 mt-2" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Register as Student
              </button>
            </form>

            <!-- COMPANY REGISTRATION FORM -->
            <form v-if="view === 'register_company'" @submit.prevent="handleRegisterCompany">
              <h4 class="text-center mb-3">Company Registration</h4>
              <div class="mb-3 text-start">
                <label class="form-label">Company Name</label>
                <input type="text" v-model="companyData.company_name" class="form-control" placeholder="Tech Corp Inc." required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">HR Email Address</label>
                <input type="email" v-model="companyData.email" class="form-control" placeholder="hr@techcorp.com" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">Password</label>
                <input type="password" v-model="companyData.password" class="form-control" placeholder="••••••••" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">HR Contact Number</label>
                <input type="text" v-model="companyData.hr_contact" class="form-control" placeholder="+91 9876543210" required>
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">Company Website</label>
                <input type="url" v-model="companyData.website" class="form-control" placeholder="https://techcorp.com" required>
              </div>
              <button type="submit" class="btn btn-info text-white w-100 py-2 mt-2" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Register Company
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      view: 'login',
      error: '',
      successMsg: '',
      loading: false,
      loginData: { email: '', password: '' },
      studentData: { full_name: '', email: '', password: '', roll_number: '', cgpa: '', branch: '' },
      companyData: { company_name: '', email: '', password: '', hr_contact: '', website: '' }
    };
  },
  methods: {
    switchView(targetView) {
      this.view = targetView;
      this.error = '';
      this.successMsg = '';
    },
    async handleLogin() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.$emit('logged-in', data.user);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async handleRegisterStudent() {
      this.loading = true;
      this.error = '';
      this.successMsg = '';
      try {
        const res = await fetch('http://localhost:5000/api/auth/register/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.studentData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Student registration failed');

        this.successMsg = 'Registration successful! You can now log in.';
        this.view = 'login';
        this.loginData.email = this.studentData.email;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async handleRegisterCompany() {
      this.loading = true;
      this.error = '';
      this.successMsg = '';
      try {
        const res = await fetch('http://localhost:5000/api/auth/register/company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.companyData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Company registration failed');

        this.successMsg = 'Company registered successfully! Awaiting Admin approval before login.';
        this.view = 'login';
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
