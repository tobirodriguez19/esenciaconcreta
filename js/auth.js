// Supabase Auth: sesión, rol admin y el mini-formulario de login del panel.
window.EC = window.EC || {};
EC.auth = function (self) {
  return {
    initAuth: async () => {
      const { data } = await supabaseClient.auth.getSession();
      await self.applySession(data.session);
      supabaseClient.auth.onAuthStateChange((_event, session) => { self.applySession(session); });
    },
    applySession: async (session) => {
      if (!session) { self.setState({ authUser: null, authRole: null, authChecked: true }); return; }
      const { data, error } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).single();
      const role = error ? null : (data && data.role);
      self.setState({ authUser: session.user, authRole: role, authChecked: true });
      if (role === 'admin') { self.loadSales(); self.loadInactive(); }
    },
    onAuthEmail: (e) => self.setState({ authEmail: e.target.value, authError: '' }),
    onAuthPassword: (e) => self.setState({ authPassword: e.target.value, authError: '' }),
    doLogin: async () => {
      const { error } = await supabaseClient.auth.signInWithPassword({ email: self.state.authEmail, password: self.state.authPassword });
      if (error) { self.setState({ authError: 'Email o contraseña incorrectos' }); return; }
      self.setState({ authPassword: '', authError: '' });
    },
    doLogout: async () => { await supabaseClient.auth.signOut(); self.navigate('/'); self.setState({ view: 'home' }); }
  };
};
