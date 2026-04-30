import { Search } from "lucide-react";

const Header = () => {
  const menuItems = [
    "Checking",
    "Savings & CDs",
    "Credit Cards",
    "Home Loans",
    "Auto Loans",
    "Investing",
    "Better Money Habits®",
  ];

  return (
    <header className="bg-background py-4 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-2xl font-bold text-bank-blue tracking-tight">
            BANK OF AMERICA
          </h1>
          <div className="flex flex-col ml-1">
            <div className="w-6 md:w-8 h-1 bg-primary rounded-full"></div>
            <div className="w-4 md:w-6 h-1 bg-primary rounded-full mt-0.5"></div>
            <div className="w-2 md:w-4 h-1 bg-primary rounded-full mt-0.5"></div>
          </div>
        </div>

        {/* Navigation Menu - Desktop only */}
        <nav className="hidden xl:flex items-center gap-6">
          {menuItems.map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Search and Language */}
        <div className="flex items-center gap-4">
          <button className="hidden md:block text-sm text-muted-foreground hover:text-foreground">
            Español
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
