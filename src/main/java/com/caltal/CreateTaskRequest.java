package com.caltal;

import java.time.LocalDate;

import org.springframework.cglib.core.Local;

public class CreateTaskRequest {
    private String name;
    private double latitude;
    private double longitude;
    private int radius;
    private LocalDate dueDate;

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

    public double getLatitude(){
        return latitude;
    }

    public void setLatitude(double latitude){
        this.latitude = latitude;
    }

    public double getLongitude(){
        return longitude;
    }

    public void setLongitude(double longitude){
        this.longitude = longitude;
    }

    public int getRadius(){
        return radius;
    }

    public void setRadius(int radius){
        this.radius = radius;
    }
}
