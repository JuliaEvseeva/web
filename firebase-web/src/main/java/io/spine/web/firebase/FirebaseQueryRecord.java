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

import com.google.protobuf.Message;
import io.spine.client.Query;
import io.spine.client.QueryResponse;
import io.spine.json.Json;
import io.spine.protobuf.AnyPacker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import java.util.stream.Stream;

import static io.spine.web.firebase.FirebaseClientProvider.firebaseClient;
import static java.util.concurrent.TimeUnit.SECONDS;
import static java.util.stream.Collectors.toList;

/**
 * A record which can be stored into a Firebase database.
 *
 * <p>A single record represents a {@linkplain QueryResponse response to a single query}.
 *
 * @author Dmytro Dashenkov
 */
final class FirebaseQueryRecord {

    private final FirebaseDatabasePath path;
    private final CompletionStage<QueryResponse> queryResponse;
    private final long writeAwaitSeconds;

    FirebaseQueryRecord(Query query,
                        CompletionStage<QueryResponse> queryResponse,
                        long writeAwaitSeconds) {
        this.path = FirebaseDatabasePath.allocateForQuery(query);
        this.queryResponse = queryResponse;
        this.writeAwaitSeconds = writeAwaitSeconds;
    }

    /**
     * Retrieves the database path to this record.
     */
    FirebaseDatabasePath path() {
        return path;
    }

    /**
     * Writes this record to the given Firebase database.
     *
     * @see FirebaseQueryBridge FirebaseQueryBridge for the detailed storage protocol
     * @param databaseUrl
     */
    void storeTo(String databaseUrl) {
        NodeUrl nodeUrl = new NodeUrl(databaseUrl, path());
        flushTo(nodeUrl);
    }

    /**
     * Writes this record to the Firebase database in a single transaction
     * (i.e. in a single batch).
     *
     * <p>Receiving data from Spine and writing it to database are both performed asynchronously.
     * @param databaseUrl
     */
    void storeTransactionallyTo(String databaseUrl) {
        NodeUrl nodeUrl = new NodeUrl(databaseUrl, path());
        flushTransactionallyTo(nodeUrl);
    }

    /**
     * Synchronously retrieves a count of records that will be supplied to the client.
     *
     * @return an integer number of records
     */
    long getCount() {
        CountConsumer countConsumer = new CountConsumer();
        queryResponse.thenAccept(countConsumer);
        return countConsumer.getValue();
    }

    /**
     * A consumer that counts the number of messages in {@link QueryResponse Query Response}.
     */
    private static class CountConsumer implements Consumer<QueryResponse> {

        private long value;

        @Override
        public void accept(QueryResponse response) {
            this.value = response.getMessagesCount();
        }

        /**
         * @return the count of messages in the consumed response
         */
        public long getValue() {
            return value;
        }
    }

    /**
     * Flushes the array response of the query to the Firebase asynchronously,
     * adding array items to storage one by one.
     *
     * <p>Suitable for big queries, spanning thousands and millions of items.
     * @param nodeUrl
     */
    private void flushTo(NodeUrl nodeUrl) {
        queryResponse.thenAccept(
                response -> {
                    try {
                        mapMessagesToJson(response).forEach(
                                json -> {
                                    NodeContent nodeContent = NodeContent.withSingleChild(json);
                                    firebaseClient().addContent(nodeUrl, nodeContent);
                                });
                    } catch (Throwable e) {
                        log().warn("Error when flushing query response: " + e.getLocalizedMessage());
                    }
                }
        );
    }

    /**
     * Flushes the array response of the query to the Firebase asynchronously but in one go.
     * @param nodeUrl
     */
    private void flushTransactionallyTo(NodeUrl nodeUrl) {
        queryResponse.thenAccept(
                response -> {
                    List<String> jsonItems = mapMessagesToJson(response).collect(toList());
                    jsonItems.forEach(item -> {
                        NodeContent nodeContent = NodeContent.withSingleChild(item);
                        firebaseClient().addContent(nodeUrl, nodeContent);
                    });
                }
        );
    }

    /**
     * Creates a stream of response messages, mapping each each response message to JSON.
     *
     * @param response Spines response to a query
     * @return a stream of messages represented by JSON strings
     */
    @SuppressWarnings("RedundantTypeArguments") // AnyPacker::unpack type cannot be inferred.
    private static Stream<String> mapMessagesToJson(QueryResponse response) {
        return response.getMessagesList()
                       .stream()
                       .unordered()
                       .map(AnyPacker::<Message>unpack)
                       .map(Json::toCompactJson);
    }

    /**
     * Awaits the given {@link Future} and catches all the exceptions.
     *
     * <p>The encountered exceptions are logged and never thrown.
     */
    private void mute(Future<?> future) {
        try {
            future.get(writeAwaitSeconds, SECONDS);
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            log().error(e.getMessage());
        }
    }

    private static Logger log() {
        return LogSingleton.INSTANCE.value;
    }

    private enum LogSingleton {
        INSTANCE;
        @SuppressWarnings("NonSerializableFieldInSerializableClass")
        private final Logger value = LoggerFactory.getLogger(FirebaseQueryRecord.class);
    }
}
