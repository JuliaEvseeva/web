/*
 * Copyright 2018, TeamDev. All rights reserved.
 *
 * Redistribution and use in source and/or binary forms, with or without
 * modification, must retain the above copyright notice and the following
 * disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package io.spine.web.firebase;

import com.google.api.client.http.ByteArrayContent;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpTransport;
import com.google.common.annotations.VisibleForTesting;

import java.util.Optional;

import static com.google.common.base.Preconditions.checkNotNull;

/**
 * A {@code FirebaseClient} which operates via the Firebase REST API.
 *
 * See Firebase REST API <a href="https://firebase.google.com/docs/reference/rest/database/">docs
 * </a>.
 */
class FirebaseRestClient implements FirebaseClient {

    /**
     * The format by which Firebase database nodes are accessible via REST API.
     *
     * <p>The first placeholder is the database URL and the second one is a node path.
     */
    private static final String NODE_URL_FORMAT = "%s/%s.json";

    /**
     * The representation of the database {@code null} entry.
     *
     * <p>In Firebase the {@code null} node is deemed nonexistent.
     */
    @SuppressWarnings("DuplicateStringLiteralInspection")
    @VisibleForTesting
    static final String NULL_ENTRY = "null";

    private final DatabaseUrl databaseUrl;
    private final HttpRequestExecutor requestExecutor;

    @VisibleForTesting
    FirebaseRestClient(DatabaseUrl databaseUrl, HttpRequestExecutor requestExecutor) {
        this.databaseUrl = databaseUrl;
        this.requestExecutor = requestExecutor;
    }

    /**
     * Creates a {@code FirebaseRestClient} which operates on the database located at given
     * {@code url} and uses given {@code httpTransport}.
     */
    static FirebaseRestClient create(DatabaseUrl url, HttpTransport httpTransport) {
        HttpRequestExecutor requestExecutor = HttpRequestExecutor.using(httpTransport);
        return new FirebaseRestClient(url, requestExecutor);
    }

    @Override
    public Optional<FirebaseNodeValue> get(FirebaseDatabasePath nodePath) {
        checkNotNull(nodePath);

        GenericUrl url = toNodeUrl(nodePath);
        String data = requestExecutor.get(url);
        if (isNullData(data)) {
            return Optional.empty();
        }
        FirebaseNodeValue value = FirebaseNodeValue.from(data);
        Optional<FirebaseNodeValue> result = Optional.of(value);
        return result;
    }

    @Override
    public void append(FirebaseDatabasePath nodePath, FirebaseNodeValue value) {
        checkNotNull(nodePath);
        checkNotNull(value);

        GenericUrl url = toNodeUrl(nodePath);
        ByteArrayContent byteArrayContent = value.toByteArray();
        Optional<FirebaseNodeValue> existingValue = get(nodePath);
        if (!existingValue.isPresent()) {
            create(url, byteArrayContent);
        } else {
            update(url, byteArrayContent);
        }
    }

    /**
     * Creates the database node with the given value or overwrites the existing one.
     */
    private void create(GenericUrl nodeUrl, HttpContent value) {
        requestExecutor.put(nodeUrl, value);
    }

    /**
     * Updates the database node with the given value.
     *
     * <p>Common entries are overwritten.
     */
    private void update(GenericUrl nodeUrl, HttpContent value) {
        requestExecutor.patch(nodeUrl, value);
    }

    private GenericUrl toNodeUrl(FirebaseDatabasePath nodePath) {
        String url = String.format(NODE_URL_FORMAT, databaseUrl, nodePath);
        return new GenericUrl(url);
    }

    private static boolean isNullData(String data) {
        return NULL_ENTRY.equals(data);
    }
}
