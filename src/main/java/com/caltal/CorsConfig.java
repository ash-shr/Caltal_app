package com.caltal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // localhost for `npm run dev`; the deployed origins are
                        // only needed as a backstop, since the website is served
                        // from the same origin as the API in production.
                        .allowedOrigins(
                                "http://localhost:5173",
                                "https://caltal.app",
                                "https://www.caltal.app",
                                "https://caltal.fly.dev")
                        .allowedMethods("GET", "POST", "PUT", "DELETE")
                        .allowedHeaders("*");
            }
        };
    }
}