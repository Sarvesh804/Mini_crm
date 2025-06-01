import { 
    Loader2, 
    ChevronLeft, 
    ChevronRight, 
    Settings,
    User,
    LogOut,
    Plus,
    Search,
    Filter,
    Download,
    Upload,
    Eye,
    EyeOff,
    Mail,
    Phone,
    Calendar,
    DollarSign,
    Users,
    TrendingUp,
    BarChart3,
    PieChart,
    Activity,
    Bell,
    Home,
    Database,
    MessageSquare,
    Target,
    Zap,
    type LucideIcon
  } from 'lucide-react'
  
  export type Icon = LucideIcon
  
  export const Icons = {
    spinner: Loader2,
    chevronLeft: ChevronLeft,
    chevronRight: ChevronRight,
    settings: Settings,
    user: User,
    logout: LogOut,
    add: Plus,
    search: Search,
    filter: Filter,
    download: Download,
    upload: Upload,
    eye: Eye,
    eyeOff: EyeOff,
    mail: Mail,
    phone: Phone,
    calendar: Calendar,
    dollar: DollarSign,
    users: Users,
    trending: TrendingUp,
    barChart: BarChart3,
    pieChart: PieChart,
    activity: Activity,
    bell: Bell,
    home: Home,
    database: Database,
    message: MessageSquare,
    target: Target,
    zap: Zap,
    logo: ({ ...props }: React.ComponentProps<'svg'>) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    google: ({ ...props }: React.ComponentProps<'svg'>) => (
      <svg viewBox="0 0 24 24" {...props}>
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    menu: ({ ...props }: React.ComponentProps<'svg'>) => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    ),
  }