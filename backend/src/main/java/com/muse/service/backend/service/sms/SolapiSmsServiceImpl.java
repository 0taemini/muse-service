package com.muse.service.backend.service.sms;

import com.muse.service.backend.dto.message.MessagePayload;
import com.muse.service.backend.dto.message.MessageRequest;
import com.muse.service.backend.global.exception.CustomException;
import com.muse.service.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

@Service
@Slf4j
public class SolapiSmsServiceImpl implements SmsService {
    private final WebClient webClient;
    private final String apiKey;
    private final String apiSecret;
    private final String fromPhoneNumber;

    public SolapiSmsServiceImpl(
            @Qualifier("solapiClient") WebClient webClient,
            @Value("${solapi.api.key}") String apiKey,
            @Value("${solapi.api.secret}") String apiSecret,
            @Value("${solapi.sender.phone-number}") String fromPhoneNumber) {
        this.webClient = webClient;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.fromPhoneNumber = fromPhoneNumber;
    }

    @Override
    public void sendVerificationCode(String phone, String verificationCode) {
        try {

            String sanitizedPhone = phone.replaceAll("-", "");
            String sanitizedFrom = fromPhoneNumber.replaceAll("-", "");
            MessageRequest message =
                    MessageRequest.builder()
                            .from(sanitizedFrom)
                            .to(sanitizedPhone)
                            .text(String.format("[뮤즈] 인증번호는 [%s] 입니다.", verificationCode))
                            .type("SMS")
                            .build();

            MessagePayload payload =
                    MessagePayload.builder().messages(List.of(message)).build();

            // 인증 헤더 생성
            String authHeader = SolapiAuth.createAuthHeader(apiKey, apiSecret);

            String response =
                    webClient
                            .post()
                            .uri("/messages/v4/send-many/detail")
                            .header("Authorization", authHeader)
                            .header("Content-Type", "application/json; charset=utf-8")
                            .bodyValue(payload)
                            .retrieve()
                            .bodyToMono(String.class)
                            .block();

            log.info("솔라피 API 응답: {}", response);
        } catch (WebClientResponseException exception) {
            log.error(
                    "SMS 발송 실패(status={}, body={})",
                    exception.getStatusCode(),
                    exception.getResponseBodyAsString(),
                    exception
            );
            throw new CustomException(ErrorCode.SMS_SEND_FAILED);
        } catch (Exception e) {
            log.error("SMS 발송 실패: {}", e.getMessage(), e);
            throw new CustomException(ErrorCode.SMS_SEND_FAILED);
        }
    }
}
