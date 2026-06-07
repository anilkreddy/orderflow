package com.orderflow.notification.service;

import com.orderflow.notification.config.NotificationMailProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private NotificationMailProperties mailProperties;
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        mailProperties = new NotificationMailProperties();
        mailProperties.setFrom("no-reply@orderflow.local");
        mailProperties.setReplyTo("support@orderflow.local");
        emailService = new EmailService(mailSender, mailProperties);
    }

    @Test
    void sendsHtmlEmailWhenEnabled() throws Exception {
        mailProperties.setEnabled(true);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendHtmlEmail("alex@example.com", "Order confirmation", "<html><body><h1>Hello</h1></body></html>");

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        MimeMessage sentMessage = messageCaptor.getValue();

        assertThat(sentMessage.getAllRecipients()).singleElement().satisfies(recipient -> assertThat(recipient.toString()).isEqualTo("alex@example.com"));
        assertThat(sentMessage.getFrom()).singleElement().satisfies(sender -> assertThat(sender.toString()).isEqualTo("no-reply@orderflow.local"));
        assertThat(sentMessage.getSubject()).isEqualTo("Order confirmation");

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        sentMessage.writeTo(outputStream);
        String rawMessage = outputStream.toString(StandardCharsets.UTF_8);
        assertThat(rawMessage).contains("<h1>Hello</h1>");
        assertThat(rawMessage).contains("text/html");
    }

    @Test
    void logsPreviewInsteadOfSendingWhenDisabled() {
        mailProperties.setEnabled(false);

        emailService.sendHtmlEmail("alex@example.com", "Order confirmation", "<html><body>preview</body></html>");

        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.any(MimeMessage.class));
    }
}
