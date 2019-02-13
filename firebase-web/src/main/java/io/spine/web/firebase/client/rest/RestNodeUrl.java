package io.spine.web.firebase.client.rest;

import com.google.api.client.http.GenericUrl;
import io.spine.web.firebase.client.DatabaseUrl;
import io.spine.web.firebase.client.NodePath;

/**
 * A URL of a single Firebase node accessed via REST.
 */
class RestNodeUrl {

    private final String url;

    private RestNodeUrl(Template template, NodePath path) {
        this.url = String.format(template.template, path);
    }

    GenericUrl asGenericUrl() {
        return new GenericUrl(url);
    }

    /**
     * A template to create {@link RestNodeUrl REST Node URLs} in the Firebase database at
     * specified {@link DatabaseUrl url}.
     */
    static class Template {

        private final String template;

        Template(DatabaseUrl url) {
            this.template = url + "/%s.json";
        }

        /**
         * Creates a new {@link RestNodeUrl} for a node at the specified {@link NodePath path}.
         */
        RestNodeUrl with(NodePath path) {
            return new RestNodeUrl(this, path);
        }
    }
}
