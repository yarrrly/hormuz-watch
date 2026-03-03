'use client';

const NEWS_ITEMS = [
    "BREAKING: IRGC deploys additional fast-attack boats near Strait of Hormuz",
    "Brent crude surges past $82/bbl amid tanker blockade fears",
    "150+ tankers anchored outside Strait — largest maritime queue since 1990",
    "Pentagon confirms GPS jamming active across Gulf of Oman",
    "Lloyd's of London raises war risk premium for Gulf transit to 2%",
    "Saudi Aramco diverts shipments via Red Sea pipeline",
    "IEA emergency meeting called for Monday — SPR release discussed",
    "China's COSCO tankers halt all Hormuz transits indefinitely",
    "Insurance premiums for Gulf passage surge 500% in 72 hours",
    "India fast-tracks strategic petroleum reserve drawdown",
    "Japan PM calls emergency energy security cabinet session",
    "EU activates fuel rationing contingency planning framework",
    "US 5th Fleet repositions carrier strike group near Strait",
    "Shipping analysts warn of $100+ Brent if blockade exceeds 2 weeks",
    "Iranian IRGC Navy fires warning shots near commercial vessel",
];

export default function NewsTicker() {
    // Duplicate items for seamless loop
    const items = [...NEWS_ITEMS, ...NEWS_ITEMS];

    return (
        <div className="news-ticker">
            <div className="news-ticker__header">
                <span style={{ color: 'var(--red)' }}>⚡</span>
                BREAKING — LIVE FEED
            </div>
            <div className="news-ticker__scroll">
                <div className="news-ticker__track">
                    {items.map((item, i) => (
                        <span key={i} className="news-ticker__item">
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
