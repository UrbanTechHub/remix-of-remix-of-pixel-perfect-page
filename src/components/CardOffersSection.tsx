import CreditCardOffer from "./CreditCardOffer";

const CardOffersSection = () => {
  const offers = [
    {
      bonus: "$200",
      bonusLabel: "online bonus offer",
      subLabel: "No annual fee.",
      cardName: "Customized Cash Rewards",
      cardDescription: "3% cash back in the category of your choice",
      cardColor: "red" as const,
    },
    {
      bonus: "$200",
      bonusLabel: "online bonus offer",
      subLabel: "No annual fee.",
      cardName: "Unlimited Cash Rewards",
      cardDescription: "Unlimited 1.5% cash back on all purchases",
      cardColor: "gray" as const,
    },
    {
      bonus: "25,000",
      bonusLabel: "online bonus points offer",
      subLabel: "No annual fee.",
      cardName: "Travel Rewards",
      cardDescription: "Unlimited 1.5 points for every $1 spent on all purchases",
      cardColor: "blue" as const,
    },
    {
      bonus: "0%",
      bonusLabel: "intro APR offer",
      subLabel: "No annual fee.",
      cardName: "BankAmericard®",
      cardDescription: "Intro APR offer for 18 billing cycles",
      cardColor: "silver" as const,
    },
  ];

  return (
    <section className="py-8">
      <h2 className="text-xl md:text-2xl font-light text-foreground text-center mb-6 md:mb-8">
        Choose the card that works for you
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {offers.map((offer, index) => (
          <CreditCardOffer key={index} {...offer} />
        ))}
      </div>
    </section>
  );
};

export default CardOffersSection;
