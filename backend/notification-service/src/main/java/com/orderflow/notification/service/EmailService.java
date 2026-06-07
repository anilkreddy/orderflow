package com.orderflow.notification.service;

import com.orderflow.notification.config.NotificationMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final NotificationMailProperties mailProperties;

    public void sendHtmlEmail(String to, String subject, String htmlBody) {
        if (!mailProperties.isEnabled()) {
            logEmailPreview(to, subject, htmlBody);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setTo(to);
            helper.setFrom(mailProperties.getFrom());
            if (StringUtils.hasText(mailProperties.getReplyTo())) {
                helper.setReplyTo(mailProperties.getReplyTo());
            }
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent recipient={} subject={}", to, subject);
        } catch (MessagingException | MailException exception) {
            log.error("Email send failed recipient={} subject={} message={}", to, subject, exception.getMessage(), exception);
            throw new IllegalStateException("Unable to send HTML email", exception);
        }
    }

    public void logEmailPreview(String to, String subject, String htmlBody) {
        log.info("Email sending disabled. Logging preview recipient={} subject={}", to, subject);
        log.info("Email preview body={} ", htmlBody);
    }
}
