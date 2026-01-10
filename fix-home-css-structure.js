const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'saksh', 'satva-organics', 'src', 'pages', 'Home', 'Home.css');
let content = fs.readFileSync(filePath, 'utf8');

// Identify the corrupted section
const startMarker = '.feature-desc-modern {';
const corruptedNextLine = '    .hero-slider-section {';

const startIndex = content.indexOf(startMarker);
const nextIndex = content.indexOf(corruptedNextLine, startIndex);

if (startIndex !== -1 && nextIndex !== -1) {
    // We found the corruption.
    // The content between startMarker and nextIndex is likely just "    font-size: 12px;\n\n"
    
    const correctFeatureDesc = `.feature-desc-modern {
    font-size: 12px;
    color: #6c757d;
    margin: 0;
    line-height: 1.4;
}

/* Image Only Banner Styles */
.promo-banner-image-only {
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
}

.promo-banner-image-only:hover {
    transform: translateY(-4px);
}

.promo-banner-image-only img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
}

/* ========================================
   RESPONSIVE - TABLET
   ======================================== */
@media (min-width: 768px) {
    .container-fluid {
        padding: 0 20px;
    }
`;

    // We need to replace from startMarker up to where .hero-slider-section starts, 
    // but we need to be careful about what we are replacing.
    // The current file has:
    // .feature-desc-modern {
    //     font-size: 12px;
    // 
    //     .hero-slider-section {
    
    // We want to replace from `.feature-desc-modern {` down to just before `.hero-slider-section {`
    
    const newContent = content.substring(0, startIndex) + correctFeatureDesc + '\n' + content.substring(nextIndex);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Home.css structure fixed!');
} else {
    console.log('Could not find corrupted pattern', { startIndex, nextIndex });
}
