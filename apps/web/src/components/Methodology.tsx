'use client';

import { useState } from 'react';

export default function Methodology() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="methodology">
            <button
                className="methodology__toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{isOpen ? '▾' : '▸'} How we calculate this</span>
            </button>

            {isOpen && (
                <div className="methodology__content">
                    <div className="methodology__section">
                        <div className="methodology__section-title">Blocked Oil Volume</div>
                        <div className="methodology__formula">
                            = (20.9M bbl/day baseline − observed flow) × days since Feb 28, 2026 14:00 UTC
                        </div>
                        <p>Observed flow estimated from AIS vessel transits (aisstream.io). Current blockade rate: ~70% reduction.</p>
                    </div>

                    <div className="methodology__section">
                        <div className="methodology__section-title">Economic Value</div>
                        <div className="methodology__formula">
                            = Blocked volume × Brent crude spot price (Twelve Data, 5-min cache)
                        </div>
                    </div>

                    <div className="methodology__section">
                        <div className="methodology__section-title">Fuel Price Impact</div>
                        <div className="methodology__formula">
                            = (Brent current − $73 baseline) × country pass-through coefficient
                        </div>
                        <p>Coefficients from EIA/World Bank historical data.</p>
                        <div className="methodology__formula">
                            Annual = per-liter increase × avg household fuel consumption
                        </div>
                    </div>

                    <div className="methodology__sources">
                        Vessel positions delayed 15 minutes for crew safety.<br />
                        Sources: aisstream.io (AIS), Twelve Data (oil prices), EIA/World Bank (fuel coefficients)
                    </div>
                </div>
            )}
        </div>
    );
}
