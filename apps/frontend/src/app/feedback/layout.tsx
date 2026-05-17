export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  // Public, anonymous patient-facing flow — deliberately no AppShell / auth.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {children}
    </div>
  );
}
