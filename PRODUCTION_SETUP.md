# 🚀 Production Setup Guide - Fix Live Deployment Issues

## 🚨 **Immediate Actions Required:**

### **1. Set Environment Variables in Render**

Go to Render Dashboard → Your Service → Environment:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | **CRITICAL** |
| `DATABASE_URL` | Your Neon connection string | **CRITICAL** |
| `SESSION_SECRET` | `1b07303dc40cc4a92cd088a5993a5948b2b5b6ea7c434eabe96d7f5db6454c94` | **CRITICAL** |

### **2. Run Database Setup in Render Shell**

1. Go to Render Dashboard → Your Service
2. Click "Shell" button
3. Run these commands:

```bash
# Check database connection
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(result => {
  console.log('✅ Database connected:', result.rows[0]);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database error:', err);
  process.exit(1);
});
"

# Create database tables
npm run db:push

# Verify tables exist
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'').then(result => {
  console.log('✅ Tables found:', result.rows.map(r => r.table_name));
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
"
```

### **3. Test API Endpoints**

After database setup, test these endpoints:

```bash
# Test health check
curl https://jukestream.onrender.com/

# Test admin registration
curl -X POST https://jukestream.onrender.com/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "displayName": "Admin User"
  }'

# Test admin login
curl -X POST https://jukestream.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## 🔍 **Common Issues & Solutions:**

### **Issue: 401 Unauthorized**
- **Cause**: No admin session established
- **Solution**: Create admin account and login first

### **Issue: Database Connection Failed**
- **Cause**: Wrong DATABASE_URL or database not accessible
- **Solution**: Verify Neon database connection string

### **Issue: Session Not Working**
- **Cause**: SESSION_SECRET not set or session store not created
- **Solution**: Set SESSION_SECRET and run db:push

### **Issue: Build Failed**
- **Cause**: Missing dependencies or build errors
- **Solution**: Check build logs in Render Events tab

## 📋 **Verification Checklist:**

- [ ] Environment variables set in Render
- [ ] Database connection working
- [ ] Database tables created
- [ ] Admin account created
- [ ] Login successful
- [ ] API endpoints responding
- [ ] Frontend loading without errors

## 🚀 **After Fixing:**

1. **Redeploy** your service in Render
2. **Test** all functionality
3. **Monitor** logs for any remaining errors
4. **Create** admin account through frontend

## 📞 **If Still Having Issues:**

1. Check Render logs for specific error messages
2. Verify all environment variables are set
3. Ensure database is accessible from Render
4. Check if build completed successfully

---

**Your app should work perfectly after following these steps! 🎵**
