const db = require('../config/db');

exports.signup = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const users = db.getUsers();
    if (users.some(u => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }
    
    const newUser = db.insertUser({ email, password });
    const session = {
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at
      },
      access_token: `mock-session-token-${Date.now()}`
    };
    
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const users = db.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const session = {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      access_token: `mock-session-token-${Date.now()}`
    };
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
