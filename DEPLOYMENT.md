# 🚀 JukeStream Deployment Guide for Render

## Prerequisites
- [Render Account](https://render.com)
- [Neon Database](https://neon.tech) (PostgreSQL)
- [GitHub Repository](https://github.com) (or GitLab/Bitbucket)

## Step 1: Prepare Your Database

### Neon Database Setup
1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy your connection string (it looks like):
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

## Step 2: Deploy on Render

### Option A: Using Render Dashboard (Recommended)
1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository
   - Select the JukeStream repository

2. **Configure Service**
   - **Name**: `jukestream` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)

3. **Build & Deploy Settings**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (or higher for production)

### Option B: Using render.yaml (Advanced)
1. Push the `render.yaml` file to your repository
2. Render will automatically detect and use it

## Step 3: Environment Variables

Set these in Render Dashboard → Environment:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_URL` | `your-neon-connection-string` | PostgreSQL database URL |
| `SESSION_SECRET` | `your-secure-random-string` | Session encryption key |
| `PORT` | `10000` | Port (Render sets this automatically) |

### Generate Session Secret
```bash
# Generate a secure 32-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Database Migration

After deployment, run database migrations:
1. Go to your Render service
2. Click "Shell"
3. Run: `npm run db:push`

## Step 5: Verify Deployment

1. **Health Check**: Your app should be accessible at the provided URL
2. **Database**: Check if database connection works
3. **Frontend**: Verify React app loads correctly
4. **API**: Test API endpoints

## Important Notes

### Security
- ✅ Never commit `.env` files
- ✅ Use strong session secrets
- ✅ Enable SSL (Render does this automatically)
- ✅ Keep dependencies updated

### Performance
- ✅ Use production build (`npm run build`)
- ✅ Enable auto-scaling if needed
- ✅ Monitor resource usage

### Database
- ✅ Use connection pooling
- ✅ Enable SSL connections
- ✅ Regular backups

## Troubleshooting

### Common Issues
1. **Build Failures**: Check build logs in Render
2. **Database Connection**: Verify DATABASE_URL format
3. **Port Issues**: Render sets PORT automatically
4. **Memory Issues**: Upgrade to higher plan if needed

### Logs
- View logs in Render Dashboard
- Check build and runtime logs
- Monitor error rates

## Support
- [Render Documentation](https://render.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [JukeStream Issues](https://github.com/your-repo/issues)

---
**Happy Deploying! 🎵**
