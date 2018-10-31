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

import com.google.api.core.ApiFuture;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.protobuf.Empty;
import com.google.protobuf.Message;
import com.google.protobuf.Timestamp;
import io.spine.base.Time;
import io.spine.client.Query;
import io.spine.client.QueryFactory;
import io.spine.testing.client.TestActorRequestFactory;
import io.spine.web.firebase.given.FirebaseQueryMediatorTestEnv.TestQueryService;
import io.spine.web.query.QueryProcessingResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;

import static io.spine.json.Json.toCompactJson;
import static io.spine.web.firebase.FirebaseClientProvider.firebaseClient;
import static io.spine.web.firebase.given.FirebaseQueryBridgeTestEnv.ONE_SECOND;
import static io.spine.web.firebase.given.FirebaseQueryBridgeTestEnv.SECONDS;
import static io.spine.web.firebase.given.FirebaseQueryBridgeTestEnv.nonTransactionalQuery;
import static io.spine.web.firebase.given.FirebaseQueryBridgeTestEnv.transactionalQuery;
import static io.spine.web.firebase.given.FirebaseQueryMediatorTestEnv.timeoutFuture;
import static java.util.Collections.singletonList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.any;
import static org.hamcrest.Matchers.anything;
import static org.hamcrest.Matchers.instanceOf;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Dmytro Dashenkov
 */
@DisplayName("FirebaseQueryBridge should")
class FirebaseQueryBridgeTest {

    private static final String TEST_DATABASE_URL = "test";

    private static final QueryFactory queryFactory =
            TestActorRequestFactory.newInstance(FirebaseQueryBridgeTest.class)
                                   .query();

    @BeforeEach
    void setUp() {
        FirebaseDatabase firebaseDatabase = mock(FirebaseDatabase.class);
        pathReference = mock(DatabaseReference.class);
        childReference = mock(DatabaseReference.class);
        when(firebaseDatabase.getReference(anyString())).thenReturn(pathReference);
        when(pathReference.push()).thenReturn(childReference);
    }

    @Test
    @DisplayName("produce a database path for the given query results")
    void testMediate() {
        TestQueryService queryService = new TestQueryService();
        FirebaseQueryBridge bridge = FirebaseQueryBridge.newBuilder()
                                                        .setQueryService(queryService)
                                                        .setDatabaseUrl(TEST_DATABASE_URL)
                                                        .build();
        Query query = queryFactory.all(Empty.class);
        QueryProcessingResult result = bridge.send(nonTransactionalQuery(query));

        assertThat(result, instanceOf(FirebaseQueryProcessingResult.class));
    }

    @Test
    @DisplayName("write query results to the database")
    void testWriteData() {
        Message dataElement = Time.getCurrentTime();
        TestQueryService queryService = new TestQueryService(dataElement);
        FirebaseQueryBridge bridge = FirebaseQueryBridge.newBuilder()
                                                        .setQueryService(queryService)
                                                        .setDatabaseUrl(TEST_DATABASE_URL)
                                                        .build();
        Query query = queryFactory.all(Timestamp.class);
        @SuppressWarnings("unused")
        QueryProcessingResult ignored = bridge.send(nonTransactionalQuery(query));
    }

    @Test
    @DisplayName("ignore execution timeouts")
    @SuppressWarnings("ResultOfMethodCallIgnored")
    void testIgnoreErrors() throws InterruptedException, ExecutionException, TimeoutException {
        futureWillNotComeFromChild();

        Message dataElement = Time.getCurrentTime();
        TestQueryService queryService = new TestQueryService(dataElement);
        long awaitSeconds = 1L;
        FirebaseQueryBridge bridge =
                FirebaseQueryBridge.newBuilder()
                                   .setQueryService(queryService)
                                   .setDatabaseUrl(TEST_DATABASE_URL)
                                   .setWriteAwaitSeconds(awaitSeconds)
                                   .build();
        Query query = queryFactory.all(Timestamp.class);
        bridge.send(nonTransactionalQuery(query));
    }

    @Test
    @DisplayName("use transactional store call")
    @SuppressWarnings("ResultOfMethodCallIgnored")
    void testTransactionalQuery() {
        TestQueryService queryService = new TestQueryService(Empty.getDefaultInstance());
        FirebaseQueryBridge bridge = FirebaseQueryBridge.newBuilder()
                                                        .setQueryService(queryService)
                                                        .setDatabaseUrl(TEST_DATABASE_URL)
                                                        .build();
        bridge.send(transactionalQuery(queryFactory.all(Empty.class)));

        verify(pathReference).setValueAsync(eq(singletonList("{}")));
        verify(childReference, never()).setValueAsync(any(Object.class));
    }

    @Test
    @DisplayName("use non-transactional store call")
    @SuppressWarnings("ResultOfMethodCallIgnored")
    void testNonTransactionalQuery() {
        TestQueryService queryService = new TestQueryService(Empty.getDefaultInstance());
        FirebaseQueryBridge bridge = FirebaseQueryBridge.newBuilder()
                                                        .setQueryService(queryService)
                                                        .setDatabaseUrl(TEST_DATABASE_URL)
                                                        .build();
        bridge.send(nonTransactionalQuery(queryFactory.all(Empty.class)));

        verify(childReference, timeout(ONE_SECOND)).setValueAsync(eq("{}"));
        verify(pathReference, never()).setValueAsync(any(Object.class));
    }

    private void futureWillComeFromChild() {
        @SuppressWarnings("unchecked") ApiFuture<Void> future = mock(ApiFuture.class);
        when(childReference.setValueAsync(anyString())).thenReturn(future);
    }

    private void futureWillNotComeFromChild()
            throws InterruptedException, ExecutionException, TimeoutException {
        ApiFuture<Void> future = timeoutFuture();
        when(childReference.setValueAsync(anyString())).thenReturn(future);
    }
}
