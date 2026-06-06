package com.orderflow.gateway.controller;

import com.orderflow.gateway.dto.GatewayStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gateway")
@Tag(name = "Gateway", description = "Gateway status and routing information")
public class GatewayStatusController {

    @GetMapping("/status")
    @Operation(summary = "Retrieve API gateway status")
    public GatewayStatusResponse status() {
        return new GatewayStatusResponse(
                "api-gateway",
                "UP",
                "Routes product and order APIs and enables frontend CORS access");
    }
}
