package com.caltal;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// The website is one page (index.html) that looks at the address to decide
// what to show. These are its other addresses: the pages emailed links open,
// and the pages inside the site. Each gets that same page, and the React app
// takes it from there. Without this, reloading /settings would be a 404.
//
// Keep in step with PAGES in SecurityConfig.
@Controller
public class WebPageController {

    @GetMapping({"/reset-password", "/verify-email", "/settings", "/places", "/terms"})
    public String page() {
        return "forward:/index.html";
    }
}
