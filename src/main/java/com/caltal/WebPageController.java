package com.caltal;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// The website is one page (index.html) that looks at the address to decide
// what to show. These are the addresses emails link to; the server hands each
// one that same page, and the React app takes it from there.
@Controller
public class WebPageController {

    @GetMapping({"/reset-password", "/verify-email"})
    public String page() {
        return "forward:/index.html";
    }
}
