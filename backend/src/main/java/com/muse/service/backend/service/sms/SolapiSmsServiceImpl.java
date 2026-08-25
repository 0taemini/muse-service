package com.muse.service.backend.service.sms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.muse.service.backend.dto.message.MessagePayload;
import com.muse.service.backend.dto.message.MessageRequest;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
@Slf4j
public class SolapiSmsServiceImpl implements SmsService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final int BULK_REQUEST_SIZE = 100;

    private final WebClient webClient;
    private final String apiKey;
    private final String apiSecret;
    private final String fromPhoneNumber;

    public SolapiSmsServiceImpl(
            @Qualifier("solapiClient") WebClient webClient,
            @Value("${solapi.api.key}") String apiKey,
            @Value("${solapi.api.secret}") String apiSecret,
            @Value("${solapi.sender.phone-number}") String fromPhoneNumber
    ) {
        this.webClient = webClient;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.fromPhoneNumber = fromPhoneNumber;
    }

    @Override
    public void sendVerificationCode(String phone, String verificationCode) {
        String sanitizedPhone = phone.replaceAll("-", "");
        try {
            String sanitizedFrom = fromPhoneNumber.replaceAll("-", "");
            MessageRequest message = MessageRequest.builder()
                    .from(sanitizedFrom)
                    .to(sanitizedPhone)
                    .text(String.format("[뮤즈] 인증번호는 [%s] 입니다.", verificationCode))
                    .type("SMS")
                    .build();

            MessagePayload payload = MessagePayload.builder()
                    .messages(List.of(message))
                    .build();

            String authHeader = SolapiAuth.createAuthHeader(apiKey, apiSecret);

            String response = webClient
                    .post()
                    .uri("/messages/v4/send-many/detail")
                    .header("Authorization", authHeader)
                    .header("Content-Type", "application/json; charset=utf-8")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("SMS 발송 완료: phone={}, responseLength={}",
                    maskPhone(sanitizedPhone), response == null ? 0 : response.length());
        } catch (WebClientResponseException exception) {
            SmsErrorSummary errorSummary = summarizeErrorBody(exception.getResponseBodyAsString());
            log.error("SMS 발송 실패: phone={}, status={}, solapiCode={}, solapiMessage={}, responseLength={}",
                    maskPhone(sanitizedPhone),
                    exception.getStatusCode(),
                    errorSummary.code(),
                    errorSummary.message(),
                    errorSummary.responseLength(),
                    exception);
            throw new CustomException(ErrorCode.SMS_SEND_FAILED);
        } catch (Exception exception) {
            log.error("SMS 발송 실패: phone={}", maskPhone(sanitizedPhone), exception);
            throw new CustomException(ErrorCode.SMS_SEND_FAILED);
        }
    }

    @Override
    public void sendBulk(List<SmsMessage> messages) {
        for (int start = 0; start < messages.size(); start += BULK_REQUEST_SIZE) {
            int end = Math.min(start + BULK_REQUEST_SIZE, messages.size());
            sendBatch(messages.subList(start, end));
        }
    }

    private void sendBatch(List<SmsMessage> messages) {
        try {
            String sanitizedFrom = fromPhoneNumber.replaceAll("-", "");
            List<MessageRequest> requests = messages.stream()
                    .map(message -> MessageRequest.builder()
                            .from(sanitizedFrom)
                            .to(message.phone().replaceAll("[^0-9]", ""))
                            .text(message.text())
                            .type("SMS")
                            .build())
                    .toList();

            String response = webClient
                    .post()
                    .uri("/messages/v4/send-many/detail")
                    .header("Authorization", SolapiAuth.createAuthHeader(apiKey, apiSecret))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .bodyValue(MessagePayload.builder().messages(requests).build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("단체 SMS 발송 완료: count={}, responseLength={}",
                    messages.size(), response == null ? 0 : response.length());
        } catch (WebClientResponseException exception) {
            log.error("단체 SMS 발송 실패: count={}, status={}, responseLength={}",
                    messages.size(), exception.getStatusCode(), exception.getResponseBodyAsString().length(), exception);
            throw new CustomException(ErrorCode.BULK_SMS_SEND_FAILED);
        } catch (Exception exception) {
            log.error("단체 SMS 발송 실패: count={}", messages.size(), exception);
            throw new CustomException(ErrorCode.BULK_SMS_SEND_FAILED);
        }
    }

    private SmsErrorSummary summarizeErrorBody(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return new SmsErrorSummary("unknown", "응답 본문 없음", 0);
        }

        try {
            JsonNode root = OBJECT_MAPPER.readTree(responseBody);
            return new SmsErrorSummary(
                    findText(root, "errorCode", "code", "error", "statusCode"),
                    findText(root, "errorMessage", "message", "reason", "description"),
                    responseBody.length()
            );
        } catch (Exception exception) {
            return new SmsErrorSummary("unparsed", "응답 본문 파싱 실패", responseBody.length());
        }
    }

    private String findText(JsonNode root, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode node = root.findValue(fieldName);
            if (node != null && !node.isNull() && !node.asText().isBlank()) {
                return sanitizeLogText(node.asText());
            }
        }
        return "unknown";
    }

    private String sanitizeLogText(String value) {
        return value.replaceAll("[\\r\\n\\t]", " ").trim();
    }

    private String maskPhone(String phone) {
        String normalized = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        if (normalized.length() < 8) {
            return "****";
        }
        return normalized.substring(0, 3) + "****" + normalized.substring(normalized.length() - 4);
    }

    private record SmsErrorSummary(String code, String message, int responseLength) {
    }
}
