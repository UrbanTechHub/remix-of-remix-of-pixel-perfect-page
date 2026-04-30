const PromoSection = () => {
  return (
    <section className="py-8 bg-muted mt-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Checking Account Offer */}
          <div className="bg-background p-6 rounded-sm">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              NEW CUSTOMER OFFER
            </span>
            <h3 className="text-xl text-secondary font-medium mt-2">
              Open a checking account
            </h3>
            <p className="text-sm text-foreground mt-3">
              Earn a <span className="font-semibold">$200 cash offer</span> when you open a new
              personal checking account and make qualifying deposits.
            </p>
          </div>

          {/* $200 Bonus Banner */}
          <div className="bg-primary text-primary-foreground p-6 rounded-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs uppercase tracking-wide">DON'T MISS OUT</span>
            <span className="text-4xl md:text-5xl font-bold mt-2">$200</span>
          </div>

          {/* Financial Education */}
          <div className="bg-bank-blue text-secondary-foreground p-6 rounded-sm md:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-medium">
              With financial education, the future looks brighter
            </h3>
            <p className="text-sm mt-3 opacity-90">
              Get free and actionable guidance from Better Money Habits® to help improve your
              financial health.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
