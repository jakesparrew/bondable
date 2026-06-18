# Therapy Management Platform

A comprehensive web application for managing therapy sessions, client relationships, and therapeutic workflows. Built with React, TypeScript, and Supabase.

## 🚀 Features

### For Therapists
- **Client Management** - Add, edit, and manage client profiles
- **Session Scheduling** - Calendar integration with Google Calendar sync
- **Task Assignment** - Create and track therapeutic tasks
- **Progress Tracking** - Monitor client progress with analytics
- **Secure Messaging** - HIPAA-compliant communication
- **Journal Review** - Access to shared client journal entries
- **Invoice Generation** - Automated billing and payment tracking

### For Clients
- **Session Management** - View and manage upcoming sessions
- **Task Completion** - Track and complete assigned therapeutic tasks
- **Journal Entries** - Private journaling with selective sharing
- **Secure Communication** - Direct messaging with therapists
- **Progress Visibility** - Track personal therapeutic progress
- **File Sharing** - Secure attachment sharing

### For Administrators
- **User Management** - Manage therapists and clients
- **System Configuration** - Configure application settings
- **Analytics Dashboard** - System-wide usage analytics
- **Notification Management** - System notification controls

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Query** - Server state management
- **React Hook Form** - Form handling and validation

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Primary database
- **Row Level Security** - Data security and access control
- **Edge Functions** - Serverless API endpoints
- **Real-time Subscriptions** - Live data updates

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Git** - Version control
- **Vercel** - Deployment platform

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── charts/         # Data visualization
│   ├── common/         # Reusable components
│   ├── dialogs/        # Modal dialogs
│   ├── layout/         # Layout components
│   ├── tables/         # Data tables
│   └── ui/             # Base UI components
├── hooks/              # Custom React hooks
│   ├── api/           # API-related hooks
│   ├── ui/            # UI-specific hooks
│   └── utils/         # Utility hooks
├── pages/              # Route components
├── services/           # Business logic
│   ├── api/           # API service classes
│   ├── cache/         # Caching utilities
│   └── utils/         # Service utilities
├── types/              # TypeScript definitions
│   ├── api/           # API types
│   ├── components/    # Component types
│   └── global/        # Shared types
├── lib/                # Utility libraries
├── constants/          # Application constants
└── integrations/       # Third-party integrations
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account
- Google Calendar API credentials (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd therapy-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Contact your system administrator for actual values
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db reset
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## 🔧 Development

### Code Standards
- **TypeScript** - All new code must be typed
- **ESLint** - Follow the configured linting rules
- **Component Documentation** - JSDoc comments for all components
- **Consistent Naming** - Follow established naming conventions

### Component Guidelines
```tsx
/**
 * Component description
 * 
 * @example
 * ```tsx
 * <MyComponent prop="value" />
 * ```
 */
interface MyComponentProps {
  /** Prop description */
  prop: string;
}

const MyComponent = ({ prop }: MyComponentProps) => {
  // Component implementation
};

export default MyComponent;
```

### API Integration
- Use service classes in `src/services/api/`
- Implement proper error handling
- Follow caching strategies
- Use TypeScript for all API calls

### Testing
```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment to Vercel
The application is configured for automatic deployment to Vercel:
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Environment Variables for Production
```env
# Production environment variables (secure these properly)
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_production_google_maps_key
```

## 📊 Architecture

### Authentication & Authorization
- Supabase Auth for user management
- Row Level Security (RLS) for data access
- Role-based permissions (admin, therapist, client)
- JWT token-based authentication

### Database Design
- PostgreSQL with Supabase
- Normalized relational design
- RLS policies for data security
- Real-time subscriptions for live updates

### State Management
- React Query for server state
- React Context for UI state
- Local state with useState/useReducer
- Optimistic updates for better UX

### Security
- HIPAA-compliant data handling
- Encrypted data transmission
- Secure file uploads
- Access control at database level

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
1. Check existing issues and PRs
2. Follow the coding standards
3. Write tests for new features
4. Update documentation
5. Ensure all checks pass

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information
- Contact the development team

## 🗺️ Roadmap

### Upcoming Features
- Mobile application
- Advanced analytics
- Integration with more calendar providers
- Enhanced reporting capabilities
- Multi-language support

### Performance Improvements
- Code splitting optimization
- Database query optimization
- Caching enhancements
- Bundle size reduction

---

*Last Updated: 2025-08-02*
