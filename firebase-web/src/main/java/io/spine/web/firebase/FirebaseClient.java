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

import java.util.Optional;

/**
 * A client which accesses the Firebase database.
 *
 * <p>The implementations are meant to work in "one client per database" format.
 */
public interface FirebaseClient {

    /**
     * Returns the content of the specified Firebase database node.
     *
     * <p>The {@code null} content (i.e. node is not present in the database) is returned as
     * {@link java.util.Optional#empty()}.
     *
     * @param nodePath
     *         the path to the requested node in the database
     * @return the node content or empty {@code Optional} if there is no content
     */
    Optional<FirebaseNodeContent> get(FirebaseDatabasePath nodePath);

    /**
     * Adds the specified content to the specified Firebase database node.
     *
     * <p>If the node doesn't exist, it is created.
     *
     * <p>If the node exists, the new content will be added to the existing entries (i.e. the node
     * content is <strong>not</strong> overwritten).
     *
     * @param nodePath
     *         the path to the node in the Firebase database
     * @param content
     *         the content to add to the node
     */
    void addContent(FirebaseDatabasePath nodePath, FirebaseNodeContent content);
}
