const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'saksh', 'satva-organics', 'src', 'pages', 'Home', 'Home.css');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix 480px block
// Look for the closing of the block which ends with .cat-nav-btn...
const block480EndRegex = /(\.cat-nav-btn,\s*\.flash-nav-btn\s*\{\s*display:\s*none\s*!important;\s*\})\s*\}/;
const block480Replacement = `$1

    .promo-banner-image-only img {
        max-height: 180px;
        object-fit: cover;
    }
}`;

if (block480EndRegex.test(content)) {
    content = content.replace(block480EndRegex, block480Replacement);
    console.log('Updated 480px block.');
} else {
    console.log('Could not find 480px block end pattern.');
}

// 2. Fix 768px block (at the end of file)
// Look for .promo-visual... display: none; ... }
const block768EndRegex = /(\.promo-visual\s*\{\s*display:\s*none;\s*\})\s*\}/;
const block768Replacement = `$1

    .promo-banner-image-only img {
        max-height: 220px;
        object-fit: cover;
    }
}`;

if (block768EndRegex.test(content)) {
    content = content.replace(block768EndRegex, block768Replacement);
    console.log('Updated 768px block.');
} else {
    console.log('Could not find 768px block end pattern.');
}

fs.writeFileSync(filePath, content, 'utf8');
