import TopNav from "@/components/TopNav";
import Header from "@/components/Header";
import LoginSidebar from "@/components/LoginSidebar";
import CardOffersSection from "@/components/CardOffersSection";
import PromoSection from "@/components/PromoSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <LoginSidebar />
          <div className="flex-1">
            <CardOffersSection />
          </div>
        </div>
      </main>

      <PromoSection />
    </div>
  );
};

export default Index;
