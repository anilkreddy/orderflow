package com.orderflow.notification.template;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final TemplateEngine templateEngine;

    public String renderTemplate(EmailTemplateType templateType, Map<String, Object> variables) {
        Context context = new Context();
        context.setVariables(variables);
        String templatePath = "email/" + templateType.templateName();
        log.info("Rendering email template type={} templatePath={}", templateType, templatePath);
        return templateEngine.process(templatePath, context);
    }
}
