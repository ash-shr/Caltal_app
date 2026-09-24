package com.caltal;

import java.time.LocalDate;
import java.time.LocalTime;

// import org.springframework.cglib.core.Local;

public class CreateTaskRequest {
    private String name;
    private Double latitude;
    private Double longitude;
    private Integer radius;
    private LocalDate dueDate;
    private ReminderType reminderType;
    private LocalTime remindAt;

    public LocalDate getDueDate(){
        return dueDate;
    }
    public void setDueDate(LocalDate dueDate){
        this.dueDate = dueDate;
    }

    public String getName(){
        return name;
    }

    public void setName(String name){
        this.name = name;
    }

    public Double getLatitude(){
        return latitude;
    }

    public void setLatitude(Double latitude){
        this.latitude = latitude;
    }

    public Double getLongitude(){
        return longitude;
    }

    public void setLongitude(Double longitude){
        this.longitude = longitude;
    }

    public Integer getRadius(){
        return radius;
    }

    public void setRadius(Integer radius){
        this.radius = radius;
    }

    public ReminderType getReminderType(){
        return reminderType;
    }

    public void setReminderType(ReminderType reminderType){
        this.reminderType = reminderType;
    }

    public LocalTime getRemindAt(){
        return remindAt;
    }

    public void setRemindAt(LocalTime remindAt){
        this.remindAt = remindAt;
    }
}
