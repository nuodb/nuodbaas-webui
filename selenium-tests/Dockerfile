# (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.
FROM selenium/standalone-chrome:131.0
USER root
RUN apt-get update \
    && apt-get install -y maven \
    && apt-get clean \
    && mkdir test
COPY src /test/src
COPY entrypoint.sh /
COPY pom.xml /test/
RUN chown -R seluser /test/
USER seluser
WORKDIR /test/
RUN mvn test-compile
ENTRYPOINT [ "/entrypoint.sh" ]
