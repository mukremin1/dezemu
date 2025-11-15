<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DEZEMU</title>
  <meta name="description" content="DEZEMU - Türkiye'nin yeni nesil e-ticaret platformu. 15 Kasım 2025" />
  <meta name="author" content="mukremin1" />
  <meta name="keywords" content="e-ticaret, dezemu, alışveriş, Türkiye, teknoloji" />
  <link rel="icon" type="image/png" href="/favicon.png" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="DEZEMU" />
  <meta property="og:description" content="DEZEMU - Türkiye'nin yeni nesil e-ticaret platformu. 15 Kasım 2025" />
  <meta property="og:image" content="https://mukremin1.github.io/dezemu/og-image.jpg" />
  <meta property="og:url" content="https://dezemu.com" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="DEZEMU" />
  <meta name="twitter:description" content="DEZEMU - Türkiye'nin yeni nesil e-ticaret platformu. 15 Kasım 2025" />
  <meta name="twitter:image" content="https://mukremin1.github.io/dezemu/og-image.jpg" />

  <!-- Google Fonts: Inter -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <!-- Tailwind CDN (dev) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } },
    }
  </script>
</head>
<body class="bg-background text-foreground">
  <div id="root"></div>

  <noscript>
    <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center font-sans">
      <h1 class="text-3xl font-bold text-primary mb-4">DEZEMU</h1>
      <p class="text-muted-foreground mb-2">JavaScript devre dışı.</p>
      <p class="text-sm text-muted-foreground">Lütfen etkinleştirin.</p>
      <p class="text-xs text-muted-foreground mt-4">
        Current time: November 15, 2025 01:21 PM +03 | Country: TR
      </p>
    </div>
  </noscript>

  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
