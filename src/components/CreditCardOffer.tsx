interface CreditCardOfferProps {
  bonus: string;
  bonusLabel: string;
  subLabel: string;
  cardName: string;
  cardDescription: string;
  cardColor: "red" | "gray" | "blue" | "silver";
}

const CreditCardOffer = ({
  bonus,
  bonusLabel,
  subLabel,
  cardName,
  cardDescription,
  cardColor,
}: CreditCardOfferProps) => {
  const colorClasses = {
    red: "from-primary to-bank-red-hover",
    gray: "from-gray-400 to-gray-600",
    blue: "from-bank-blue to-bank-blue-light",
    silver: "from-gray-300 to-gray-500",
  };

  return (
    <div className="flex flex-col items-center text-center group cursor-pointer">
      {/* Bonus Amount */}
      <div className="mb-2">
        <span className="text-4xl font-light text-primary">{bonus}</span>
      </div>
      <p className="text-xs text-primary mb-1">{bonusLabel}</p>
      <p className="text-xs text-muted-foreground mb-4">{subLabel}</p>

      {/* Credit Card Image */}
      <div className="relative mb-4">
        <div
          className={`w-40 h-24 rounded-lg bg-gradient-to-br ${colorClasses[cardColor]} shadow-lg transform group-hover:scale-105 transition-transform flex flex-col justify-between p-3`}
        >
          <div className="flex items-start justify-between">
            <div className="w-6 h-4 bg-bank-gold rounded-sm"></div>
            <div className="text-[6px] text-primary-foreground/80 text-right leading-tight">
              BANK OF AMERICA
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-[8px] text-primary-foreground/60">Signature</span>
            <span className="text-xs font-bold text-primary-foreground tracking-wider">
              VISA
            </span>
          </div>
        </div>
        {/* Sound/NFC indicator */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
          <div className="flex flex-col gap-0.5">
            <div className="w-1 h-3 bg-muted-foreground/30 rounded-full"></div>
            <div className="w-1 h-4 bg-muted-foreground/40 rounded-full"></div>
            <div className="w-1 h-3 bg-muted-foreground/30 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Card Name */}
      <h3 className="text-sm font-medium text-foreground mb-1">{cardName}</h3>
      <a href="#" className="text-xs text-secondary hover:underline">
        {cardDescription} &gt;
      </a>
    </div>
  );
};

export default CreditCardOffer;
