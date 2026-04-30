import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Globe, Zap, ChevronRight } from "lucide-react";

const PayTransferHub = () => {
  const navigate = useNavigate();

  const options = [
    {
      key: "domestic",
      title: "Domestic Transfer",
      desc: "ACH / Internal · 1–3 business days or instant",
      icon: Building2,
      route: "/transfer/domestic",
    },
    {
      key: "international",
      title: "International Transfer",
      desc: "Send money outside the U.S. via SWIFT",
      icon: Globe,
      route: "/transfer/international",
    },
    {
      key: "wire",
      title: "Wire Transfer",
      desc: "Same-day, irreversible (domestic or international)",
      icon: Zap,
      route: "/transfer/wire",
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Pay & Transfer</h1>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => navigate(o.route)}
            className="w-full bg-background rounded-lg shadow-sm p-4 flex items-center gap-4 hover:bg-accent transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <o.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground">{o.title}</h2>
              <p className="text-sm text-muted-foreground">{o.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PayTransferHub;
