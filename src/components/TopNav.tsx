import { Menu } from "lucide-react";
import { useState } from "react";

const TopNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const navItems = [
    { label: "Personal", active: true },
    { label: "Small Business", active: false },
    { label: "Wealth Management", active: false },
    { label: "Businesses & Institutions", active: false },
    { label: "Security", active: false },
    { label: "About Us", active: false },
  ];

  const rightItems = ["En español", "Contact Us", "Help"];

  return (
    <nav className="bg-background border-b border-border py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile menu button */}
        <button 
          className="lg:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={`text-sm hover:underline ${
                  item.active
                    ? "text-foreground font-medium border-b-2 border-primary pb-1"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <ul className="hidden lg:flex items-center gap-6">
          {rightItems.map((item) => (
            <li key={item}>
              <a href="#" className="text-sm text-muted-foreground hover:underline">
                {item}
              </a>
            </li>
          ))}
        </ul>
        
        {/* Mobile: show Help only */}
        <a href="#" className="lg:hidden text-sm text-muted-foreground hover:underline">
          Help
        </a>
      </div>
      
      {/* Mobile dropdown menu */}
      {isOpen && (
        <div className="lg:hidden mt-2 pb-2 border-t border-border pt-2">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className={`block px-2 py-1 text-sm ${
                    item.active ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="border-t border-border pt-2 mt-2">
              {rightItems.map((item) => (
                <a key={item} href="#" className="block px-2 py-1 text-sm text-muted-foreground">
                  {item}
                </a>
              ))}
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default TopNav;
