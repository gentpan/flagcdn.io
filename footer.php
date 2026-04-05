<?php
$footerClass = isset($footerClass) ? $footerClass : '';
$showFooterNav = isset($showFooterNav) ? $showFooterNav : false;
$footerScripts = isset($footerScripts) ? $footerScripts : '';
?>
    <footer class="footer<?php echo $footerClass ? ' ' . $footerClass : ''; ?>">
      <div class="footer-main">
        <div class="container">
          <p class="footer-tagline" data-i18n="footer.tagline">Lightweight SVG country flags · Fast CDN · ISO 3166-1</p>
          <div class="footer-ad" id="footer-ad" aria-label="Advertisement">
            <!-- 广告位：在此处粘贴广告代码，或保留空白 -->
          </div>
        </div>
      </div>
      <div class="footer-bar">
        <div class="container footer-bar-inner">
          <p class="footer-copy">© 2026 <span class="footer-copy-domain">flagcdn.io</span> All rights reserved.</p>
          <div class="footer-icons">
            <a href="mailto:support@flagcdn.io" class="footer-icon" title="support@flagcdn.io" aria-label="Email"><i class="fa-solid fa-envelope"></i></a>
            <a href="https://x.com/gentpan" class="footer-icon" target="_blank" rel="noopener noreferrer" title="X"><i class="fa-brands fa-x-twitter"></i></a>
            <a href="https://github.com/gentpan" class="footer-icon" target="_blank" rel="noopener noreferrer" title="GitHub"><i class="fa-brands fa-github"></i></a>
            <a href="https://xifeng.net" class="footer-icon" target="_blank" rel="noopener noreferrer" data-i18n-title="footerTitle.xifeng" title="Xifeng Blog"><i class="fa-brands fa-red-river"></i></a>
          </div>
        </div>
      </div>
    </footer>

    <?php echo $footerScripts; ?>
    <script src="/assets/site.js"></script>
  </body>
</html>
