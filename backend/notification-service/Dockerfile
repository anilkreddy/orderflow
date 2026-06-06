FROM gradle:9.5.0-jdk21 AS builder

WORKDIR /home/gradle/project

COPY --chown=gradle:gradle . .

RUN gradle :notification-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /home/gradle/project/notification-service/build/libs/*.jar app.jar

EXPOSE 8083

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
