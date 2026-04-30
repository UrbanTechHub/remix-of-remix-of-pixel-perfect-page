import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
}

const TransferLayout = ({ title, children }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-background rounded-lg shadow-sm p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
};

export default TransferLayout;
