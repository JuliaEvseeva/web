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

import com.google.firebase.database.FirebaseDatabase;
import com.google.protobuf.Message;
import io.spine.client.QueryResponse;
import io.spine.json.Json;
import io.spine.protobuf.AnyPacker;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.stream.Stream;

import static io.spine.web.firebase.FirebaseClientProvider.firebaseClient;
import static io.spine.web.firebase.FirebaseSubscriptionDiff.computeDiff;
import static java.util.stream.Collectors.toList;

/**
 * A subscription record that gets stored into a {@link FirebaseDatabase}.
 *
 * <p>Supports both an initial store and consequent updates of the stored data.
 *
 * @author Mykhailo Drachuk
 */
final class FirebaseSubscriptionRecord {

    private final FirebaseDatabasePath path;
    private final CompletionStage<QueryResponse> queryResponse;

    FirebaseSubscriptionRecord(FirebaseDatabasePath path,
                               CompletionStage<QueryResponse> queryResponse) {
        this.path = path;
        this.queryResponse = queryResponse;
    }

    /**
     * Retrieves the database path to this record.
     */
    FirebaseDatabasePath path() {
        return path;
    }

    /**
     * Writes this record to the given {@link FirebaseDatabase} as initial data, without checking
     * what is already stored in database at given location.
     * @param databaseUrl
     */
    void storeAsInitial(String databaseUrl) {
        NodeUrl nodeUrl = new NodeUrl(databaseUrl, path());
        flushNewTo(nodeUrl);
    }

    /**
     * Flushes an array response of the query to the Firebase asynchronously,
     * adding array items to storage in a transaction.
     * @param nodeUrl
     */
    private void flushNewTo(NodeUrl nodeUrl) {
        queryResponse.thenAccept(response -> {
            List<String> newEntries = mapMessagesToJson(response).collect(toList());
            NodeContent nodeContent = new NodeContent();
            newEntries.forEach(nodeContent::pushData);
            firebaseClient().addContent(nodeUrl, nodeContent);
        });
    }

    /**
     * Stores the data to the Firebase, updating only the data that has changed.
     * @param databaseUrl
     */
    void storeAsUpdate(String databaseUrl) {
        NodeUrl nodeUrl = new NodeUrl(databaseUrl, path());
        flushDiffTo(nodeUrl);
    }

    /**
     * Flushes an array response of the query to the Firebase asynchronously,
     * adding, removing and updating items already present in storage in a transaction.
     * @param nodeUrl
     */
    private void flushDiffTo(NodeUrl nodeUrl) {
        queryResponse.thenAccept(response -> {
            List<String> newEntries = mapMessagesToJson(response).collect(toList());
            Optional<NodeContent> existingContent = firebaseClient().get(nodeUrl);
            if (!existingContent.isPresent()) {
                NodeContent nodeContent = new NodeContent();
                newEntries.forEach(nodeContent::pushData);
                firebaseClient().addContent(nodeUrl, nodeContent);
            } else {
                FirebaseSubscriptionDiff diff = computeDiff(newEntries, existingContent.get());
                updateWithDiff(nodeUrl, diff);
            }
        });
    }

    private static void updateWithDiff(NodeUrl nodeUrl, FirebaseSubscriptionDiff diff) {
        NodeContent nodeContent = new NodeContent();
        diff.changed()
            .forEach(record -> {
                nodeContent.addChild(record.key(), record.data());
            });
        diff.removed()
            .forEach(record -> {
                nodeContent.addChild(record.key(), "null");
            });
        diff.added()
            .forEach(record -> {
                nodeContent.pushData(record.data());
            });
        firebaseClient().addContent(nodeUrl, nodeContent);
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
}
