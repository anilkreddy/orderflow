package com.orderflow.notification.template;

public enum EmailTemplateType {
    ORDER_CONFIRMATION("order-confirmation"),
    ORDER_CANCELLED("order-cancelled"),
    LOW_STOCK_ALERT("low-stock-alert");

    private final String templateName;

    EmailTemplateType(String templateName) {
        this.templateName = templateName;
    }

    public String templateName() {
        return templateName;
    }
}
