const Login = {
  template: `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <h3 class="card-title text-center mb-4">Login to Placement Portal</h3>
            
            <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

            <form @submit.prevent="handleLogin">
              <div class="mb-3 text-start">
                <label class="form-label font-weight-bold">Email Address</label>
                <input type="email" v-model="email" class="form-control" placeholder="user@domain.com" required>
              </div>

              <div class="mb-3 text-start">
                <label class="form-label font-weight-bold">Password</label>
                <input type="password" v-model="password" class="form-control" placeholder="••••••••" required>
              </div>

              <button type="submit" class="btn btn-primary w-100 py-2 mt-2" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email, password: this.password })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.$emit('logged-in', data.user);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
