package com.muse.service.backend.service.sms;

import com.muse.service.backend.dto.sms.BulkSmsSendRequest;
import com.muse.service.backend.dto.sms.BulkSmsSendResponse;

public interface BulkSmsService {
    BulkSmsSendResponse send(BulkSmsSendRequest request);
}